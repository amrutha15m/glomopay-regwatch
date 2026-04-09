from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean,
    DateTime, Text, ForeignKey,
)
from sqlalchemy.orm import relationship
from database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    source = Column(String(100), nullable=False)
    publication_date = Column(String(20), nullable=True)
    source_url = Column(String(1000), nullable=False, unique=True)
    file_path = Column(String(500), nullable=True)
    raw_text = Column(Text, nullable=True)
    reviewed = Column(Boolean, default=False, nullable=False)
    ingestion_status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    analysis = relationship("AIAnalysis", back_populates="document", uselist=False, cascade="all, delete-orphan")
    feedback_entries = relationship("Feedback", back_populates="document", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True)
    section_title = Column(String(500), nullable=True)
    citation_label = Column(String(100), nullable=False)

    document = relationship("Document", back_populates="chunks")


class AIAnalysis(Base):
    __tablename__ = "ai_analysis"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, unique=True, index=True)
    summary = Column(Text, nullable=True)
    why_it_matters = Column(Text, nullable=True)
    impacted_functions = Column(Text, nullable=True)  # JSON string
    action_items = Column(Text, nullable=True)          # JSON string
    tags = Column(Text, nullable=True)                  # JSON string
    relevance_score = Column(Float, nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="analysis")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    summary_helpful = Column(Boolean, nullable=True)
    relevance_feedback = Column(String(20), nullable=True)  # correct/too_high/too_low
    tags_correct = Column(Boolean, nullable=True)
    action_items_useful = Column(Boolean, nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="feedback_entries")


class IngestionRun(Base):
    __tablename__ = "ingestion_runs"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(100), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="running")  # running/completed/failed
    documents_found = Column(Integer, default=0)
    new_documents_added = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user/assistant
    message = Column(Text, nullable=False)
    citations_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="chat_messages")
