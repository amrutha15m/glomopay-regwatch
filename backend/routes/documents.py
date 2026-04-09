"""Document listing, detail, review, and Q&A routes."""
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models.models import Document, AIAnalysis, DocumentChunk, ChatMessage
from schemas.schemas import QuestionRequest
from services import ai_service, ingestion_service

router = APIRouter(prefix="/api/documents", tags=["documents"])


def _top_chunks_for_text(text: str, chunks: list, n: int = 3) -> list:
    """Return the top-N chunks most relevant to a given text via keyword overlap."""
    if not chunks or not text:
        return []
    words = set(text.lower().split())
    scored = sorted(chunks, key=lambda c: len(words & set(c["text"].lower().split())), reverse=True)
    return scored[:n]


def _doc_to_list_item(doc: Document) -> dict:
    analysis = doc.analysis
    return {
        "id": doc.id,
        "title": doc.title,
        "source": doc.source,
        "publication_date": doc.publication_date,
        "source_url": doc.source_url,
        "reviewed": doc.reviewed,
        "ingestion_status": doc.ingestion_status,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "relevance_score": analysis.relevance_score if analysis else None,
        "tags": json.loads(analysis.tags) if analysis and analysis.tags else [],
        "summary": (
            (analysis.summary[:200] + "...") if analysis and analysis.summary and len(analysis.summary) > 200
            else (analysis.summary if analysis else None)
        ),
    }


@router.get("")
def list_documents(
    source: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    reviewed: Optional[bool] = Query(None),
    min_relevance: Optional[float] = Query(None),
    q: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Document)

    if source:
        query = query.filter(Document.source == source)
    if date_from:
        query = query.filter(Document.publication_date >= date_from)
    if date_to:
        query = query.filter(Document.publication_date <= date_to)
    if reviewed is not None:
        query = query.filter(Document.reviewed == reviewed)
    if q:
        query = query.filter(
            Document.title.ilike(f"%{q}%") |
            Document.raw_text.ilike(f"%{q}%")
        )

    docs = query.order_by(Document.created_at.desc()).offset(skip).limit(limit).all()
    result = [_doc_to_list_item(doc) for doc in docs]

    if min_relevance is not None:
        result = [r for r in result if r.get("relevance_score") is None or r["relevance_score"] >= min_relevance]

    return result


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total = db.query(Document).count()
    reviewed = db.query(Document).filter(Document.reviewed == True).count()
    high_relevance = db.query(Document).join(AIAnalysis).filter(AIAnalysis.relevance_score >= 0.75).count()
    sources = db.query(Document.source).distinct().all()
    return {
        "total": total,
        "reviewed": reviewed,
        "unreviewed": total - reviewed,
        "high_relevance": high_relevance,
        "sources": [s[0] for s in sources],
    }


@router.get("/{document_id}")
def get_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    analysis = doc.analysis
    chunks = sorted(doc.chunks, key=lambda c: c.chunk_index)

    chunks_data = [
        {
            "citation_label": c.citation_label,
            "text": c.text,
            "chunk_index": c.chunk_index,
            "page_number": c.page_number,
        }
        for c in chunks
    ]

    def _cite(chunk: dict) -> dict:
        return {
            "label": chunk["citation_label"],
            "text": chunk["text"][:400],
            "chunk_index": chunk["chunk_index"],
            "page_number": chunk["page_number"],
        }

    summary_citations = [_cite(c) for c in _top_chunks_for_text(analysis.summary if analysis else "", chunks_data)] if analysis else []
    why_citations = [_cite(c) for c in _top_chunks_for_text(analysis.why_it_matters if analysis else "", chunks_data)] if analysis else []

    return {
        "id": doc.id,
        "title": doc.title,
        "source": doc.source,
        "publication_date": doc.publication_date,
        "source_url": doc.source_url,
        "file_path": doc.file_path,
        "reviewed": doc.reviewed,
        "ingestion_status": doc.ingestion_status,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
        "analysis": {
            "id": analysis.id,
            "summary": analysis.summary,
            "why_it_matters": analysis.why_it_matters,
            "impacted_functions": json.loads(analysis.impacted_functions) if analysis.impacted_functions else [],
            "action_items": json.loads(analysis.action_items) if analysis.action_items else [],
            "tags": json.loads(analysis.tags) if analysis.tags else [],
            "relevance_score": analysis.relevance_score,
            "generated_at": analysis.generated_at.isoformat() if analysis.generated_at else None,
            "summary_citations": summary_citations,
            "why_it_matters_citations": why_citations,
        } if analysis else None,
        "chunks": [
            {
                "id": c.id,
                "chunk_index": c.chunk_index,
                "text": c.text,
                "page_number": c.page_number,
                "citation_label": c.citation_label,
            }
            for c in chunks[:50]
        ],
        "chat_messages": [
            {
                "id": m.id,
                "role": m.role,
                "message": m.message,
                "citations": json.loads(m.citations_json) if m.citations_json else [],
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in sorted(doc.chat_messages, key=lambda x: x.created_at)
        ],
    }


@router.post("/{document_id}/reprocess")
def reprocess_document(document_id: int, db: Session = Depends(get_db)):
    """Re-fetch text and regenerate AI analysis for a document."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    ingestion_service.process_uploaded_document(db, doc)
    return {"id": doc.id, "ingestion_status": doc.ingestion_status}


@router.patch("/{document_id}/reviewed")
def toggle_reviewed(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.reviewed = not doc.reviewed
    db.commit()
    return {"id": doc.id, "reviewed": doc.reviewed}


@router.delete("/{document_id}/chat")
def clear_chat(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.query(ChatMessage).filter(ChatMessage.document_id == document_id).delete()
    db.commit()
    return {"ok": True}


@router.post("/{document_id}/question")
def ask_question(document_id: int, request: QuestionRequest, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).all()
    chunks_data = [
        {
            "citation_label": c.citation_label,
            "text": c.text,
            "chunk_index": c.chunk_index,
            "page_number": c.page_number,
        }
        for c in sorted(chunks, key=lambda x: x.chunk_index)
    ]

    result = ai_service.answer_document_question(request.question, chunks_data)

    user_msg = ChatMessage(document_id=document_id, role="user", message=request.question)
    db.add(user_msg)

    assistant_msg = ChatMessage(
        document_id=document_id,
        role="assistant",
        message=result["answer"],
        citations_json=json.dumps(result["citations"]),
    )
    db.add(assistant_msg)
    db.commit()

    return result
