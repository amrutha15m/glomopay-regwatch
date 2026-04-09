"""Feedback and evaluation routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.models import Document, Feedback
from services.evaluation_service import get_evaluation_metrics

router = APIRouter(prefix="/api", tags=["feedback"])


@router.post("/documents/{document_id}/feedback")
def submit_feedback(document_id: int, feedback_data: dict, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    feedback = Feedback(
        document_id=document_id,
        summary_helpful=feedback_data.get("summary_helpful"),
        relevance_feedback=feedback_data.get("relevance_feedback"),
        tags_correct=feedback_data.get("tags_correct"),
        action_items_useful=feedback_data.get("action_items_useful"),
        comment=feedback_data.get("comment"),
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    return {"id": feedback.id, "document_id": feedback.document_id, "message": "Feedback recorded successfully"}


@router.get("/evaluation")
def get_evaluation(db: Session = Depends(get_db)):
    return get_evaluation_metrics(db)
