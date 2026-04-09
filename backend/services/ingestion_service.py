"""Ingestion orchestration service."""
import os
import json
import logging
import requests
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from models.models import Document, DocumentChunk, AIAnalysis, IngestionRun
from services import pdf_service, ai_service
from connectors import ifsca as ifsca_connector
from connectors import rbi as rbi_connector

logger = logging.getLogger(__name__)

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

CONNECTOR_MAP = {
    "IFSCA": ifsca_connector,
    "RBI": rbi_connector,
}


def _document_exists(db: Session, source_url: str) -> bool:
    return db.query(Document).filter(Document.source_url == source_url).first() is not None


def _download_pdf(url: str, doc_id: int, source: str) -> Optional[str]:
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; GlomoPay-RegWatch/1.0)",
            "Accept": "application/pdf,*/*",
        }
        resp = requests.get(url, headers=headers, timeout=30, stream=True)
        resp.raise_for_status()

        content_type = resp.headers.get("content-type", "")
        if "pdf" not in content_type.lower() and not url.lower().endswith(".pdf"):
            return None

        filename = f"{source.lower()}_{doc_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
        filepath = os.path.join(UPLOAD_DIR, filename)

        with open(filepath, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)

        return filepath
    except Exception as e:
        logger.warning(f"Failed to download PDF from {url}: {e}")
        return None


def _fetch_html_text(url: str) -> Optional[str]:
    """Extract readable text from an HTML page as fallback for non-PDF documents."""
    try:
        from bs4 import BeautifulSoup
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; GlomoPay-RegWatch/1.0)",
            "Accept": "text/html,*/*",
        }
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        content_type = resp.headers.get("content-type", "")
        if "html" not in content_type.lower():
            return None
        soup = BeautifulSoup(resp.content, "lxml")
        # Remove nav, header, footer, script, style noise
        for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
            tag.decompose()
        # Try main content areas first
        for selector in ["main", "article", "#content", ".content", "#main", ".main"]:
            el = soup.select_one(selector)
            if el:
                text = el.get_text(separator=" ", strip=True)
                if len(text) > 200:
                    return text
        # Fall back to body
        body = soup.find("body")
        if body:
            text = body.get_text(separator=" ", strip=True)
            if len(text) > 100:
                return text
        return None
    except Exception as e:
        logger.warning(f"Failed to fetch HTML text from {url}: {e}")
        return None


def _process_document(db: Session, doc: Document) -> None:
    # Download PDF — try all source URLs, not just those ending in .pdf
    if doc.source_url and not doc.file_path:
        file_path = _download_pdf(doc.source_url, doc.id, doc.source)
        if file_path:
            doc.file_path = file_path
            doc.ingestion_status = "downloaded"

    # Parse text from PDF
    if doc.file_path and not doc.raw_text:
        raw_text = pdf_service.extract_text_from_pdf(doc.file_path)
        if raw_text:
            doc.raw_text = raw_text
            doc.ingestion_status = "parsed"

    # Fallback: extract text from HTML page if no PDF text available
    if not doc.raw_text and doc.source_url:
        html_text = _fetch_html_text(doc.source_url)
        if html_text:
            doc.raw_text = html_text
            doc.ingestion_status = "parsed"

    # Create chunks
    existing_chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).count()
    if existing_chunks == 0:
        if doc.file_path:
            chunks_data = pdf_service.chunk_text_by_page(doc.file_path)
        elif doc.raw_text:
            chunks_data = pdf_service.chunk_text_simple(doc.raw_text)
        else:
            chunks_data = []

        for cd in chunks_data:
            chunk = DocumentChunk(
                document_id=doc.id,
                chunk_index=cd["chunk_index"],
                text=cd["text"],
                page_number=cd["page_number"],
                section_title=cd["section_title"],
                citation_label=cd["citation_label"],
            )
            db.add(chunk)

    # Generate AI analysis — also regenerate if existing analysis has placeholder text
    _PLACEHOLDER = "Document text not available for analysis."
    existing_analysis = doc.analysis
    needs_analysis = (
        not existing_analysis or
        (doc.raw_text and existing_analysis.summary == _PLACEHOLDER)
    )
    if needs_analysis:
        text_for_ai = doc.raw_text or doc.title
        analysis_data = ai_service.generate_full_analysis(text_for_ai)
        if existing_analysis:
            existing_analysis.summary = analysis_data["summary"]
            existing_analysis.why_it_matters = analysis_data["why_it_matters"]
            existing_analysis.action_items = json.dumps(analysis_data["action_items"])
            existing_analysis.tags = json.dumps(analysis_data["tags"])
            existing_analysis.relevance_score = analysis_data["relevance_score"]
        else:
            analysis = AIAnalysis(
                document_id=doc.id,
                summary=analysis_data["summary"],
                why_it_matters=analysis_data["why_it_matters"],
                impacted_functions=json.dumps(["compliance", "operations"]),
                action_items=json.dumps(analysis_data["action_items"]),
                tags=json.dumps(analysis_data["tags"]),
                relevance_score=analysis_data["relevance_score"],
            )
            db.add(analysis)

    db.commit()


def run_ingestion(db: Session, sources: list = None) -> list:
    if sources is None:
        sources = list(CONNECTOR_MAP.keys())

    results = []

    for source in sources:
        connector = CONNECTOR_MAP.get(source)
        if not connector:
            logger.warning(f"No connector for source: {source}")
            continue

        run = IngestionRun(source=source, started_at=datetime.utcnow(), status="running")
        db.add(run)
        db.commit()
        db.refresh(run)

        try:
            publications = connector.fetch_publications()
            run.documents_found = len(publications)
            new_count = 0

            for pub in publications:
                try:
                    if _document_exists(db, pub["source_url"]):
                        continue

                    doc = Document(
                        title=pub["title"],
                        source=source,
                        publication_date=pub.get("publication_date"),
                        source_url=pub["source_url"],
                        ingestion_status="pending",
                    )
                    db.add(doc)
                    db.commit()
                    db.refresh(doc)

                    _process_document(db, doc)
                    new_count += 1

                except Exception as e:
                    logger.error(f"Error processing publication {pub.get('source_url', '')}: {e}")
                    db.rollback()
                    continue

            run.new_documents_added = new_count
            run.status = "completed"
            run.completed_at = datetime.utcnow()
            db.commit()

        except Exception as e:
            run.status = "failed"
            run.error_message = str(e)
            run.completed_at = datetime.utcnow()
            db.commit()
            logger.error(f"Ingestion failed for {source}: {e}")

        results.append({
            "source": source,
            "status": run.status,
            "documents_found": run.documents_found,
            "new_documents_added": run.new_documents_added,
            "error_message": run.error_message,
        })

    return results


def process_uploaded_document(db: Session, doc: Document) -> None:
    _process_document(db, doc)
