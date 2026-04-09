"""Document upload route."""
import os
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.models import Document
from services import ingestion_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["upload"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


@router.post("/upload")
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    safe_name = "".join(c for c in file.filename if c.isalnum() or c in "._- ")
    filename = f"upload_{timestamp}_{safe_name}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    title = file.filename.replace(".pdf", "").replace("_", " ").replace("-", " ").strip()
    source_url = f"local://uploads/{filename}"

    existing = db.query(Document).filter(Document.source_url == source_url).first()
    if existing:
        raise HTTPException(status_code=400, detail="Document already uploaded")

    doc = Document(
        title=title,
        source="Upload",
        publication_date=datetime.now().strftime("%Y-%m-%d"),
        source_url=source_url,
        file_path=filepath,
        ingestion_status="downloaded",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    ingestion_service.process_uploaded_document(db, doc)
    db.refresh(doc)

    return {
        "document_id": doc.id,
        "title": doc.title,
        "ingestion_status": doc.ingestion_status,
        "message": "Document uploaded and processed successfully",
    }
