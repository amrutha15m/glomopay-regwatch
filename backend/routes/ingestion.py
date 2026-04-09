"""Ingestion trigger and history routes."""
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session

from database import get_db, SessionLocal
from models.models import IngestionRun, Document, AIAnalysis
from services import ingestion_service

router = APIRouter(prefix="/api/ingestion", tags=["ingestion"])

AVAILABLE_SOURCES = ["IFSCA", "SEBI"]


def _run_ingestion_bg(sources):
    db = SessionLocal()
    try:
        ingestion_service.run_ingestion(db, sources)
    finally:
        db.close()


@router.post("/trigger")
def trigger_all(background_tasks: BackgroundTasks):
    background_tasks.add_task(_run_ingestion_bg, None)
    return {"message": "Ingestion triggered for all sources", "sources": AVAILABLE_SOURCES}


@router.post("/trigger/{source}")
def trigger_source(source: str, background_tasks: BackgroundTasks):
    if source not in AVAILABLE_SOURCES:
        raise HTTPException(status_code=400, detail=f"Unknown source: {source}. Available: {AVAILABLE_SOURCES}")
    background_tasks.add_task(_run_ingestion_bg, [source])
    return {"message": f"Ingestion triggered for {source}", "source": source}


def _reprocess_all_bg():
    """Reprocess all documents that have placeholder or missing analysis."""
    _PLACEHOLDER = "Document text not available for analysis."
    db = SessionLocal()
    try:
        # Documents with no analysis
        no_analysis = (
            db.query(Document)
            .outerjoin(AIAnalysis, Document.id == AIAnalysis.document_id)
            .filter(AIAnalysis.id == None)
            .all()
        )
        # Documents with placeholder summary
        placeholder = (
            db.query(Document)
            .join(AIAnalysis, Document.id == AIAnalysis.document_id)
            .filter(AIAnalysis.summary == _PLACEHOLDER)
            .all()
        )
        docs = {d.id: d for d in no_analysis + placeholder}.values()
        for doc in docs:
            try:
                ingestion_service.process_uploaded_document(db, doc)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Reprocess failed for doc {doc.id}: {e}")
    finally:
        db.close()


@router.post("/reprocess")
def reprocess_all(background_tasks: BackgroundTasks):
    """Re-extract text and regenerate AI analysis for all documents with missing/placeholder analysis."""
    background_tasks.add_task(_reprocess_all_bg)
    return {"message": "Reprocessing queued for all documents with missing or placeholder analysis"}


@router.get("/history")
def get_history(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    runs = db.query(IngestionRun).order_by(IngestionRun.started_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": r.id,
            "source": r.source,
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            "status": r.status,
            "documents_found": r.documents_found,
            "new_documents_added": r.new_documents_added,
            "error_message": r.error_message,
        }
        for r in runs
    ]


@router.get("/status")
def get_status(db: Session = Depends(get_db)):
    result = []
    for source in AVAILABLE_SOURCES:
        last_run = (
            db.query(IngestionRun)
            .filter(IngestionRun.source == source)
            .order_by(IngestionRun.started_at.desc())
            .first()
        )
        result.append({
            "source": source,
            "last_run_at": last_run.started_at.isoformat() if last_run and last_run.started_at else None,
            "last_status": last_run.status if last_run else None,
            "new_documents_added": last_run.new_documents_added if last_run else None,
        })
    return result
