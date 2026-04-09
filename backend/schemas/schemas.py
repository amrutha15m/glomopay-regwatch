import json
from datetime import datetime
from typing import List, Optional, Any

from pydantic import BaseModel, ConfigDict, field_validator


def _parse_json_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(i) for i in value]
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return [str(i) for i in parsed]
        except (json.JSONDecodeError, ValueError):
            pass
    return []


# ---------------------------------------------------------------------------
# AI Analysis
# ---------------------------------------------------------------------------

class AIAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: int
    summary: Optional[str] = None
    why_it_matters: Optional[str] = None
    impacted_functions: List[str] = []
    action_items: List[str] = []
    tags: List[str] = []
    relevance_score: Optional[float] = None
    generated_at: Optional[datetime] = None

    @field_validator("impacted_functions", "action_items", "tags", mode="before")
    @classmethod
    def parse_json_fields(cls, v: Any) -> List[str]:
        return _parse_json_list(v)


# ---------------------------------------------------------------------------
# Document
# ---------------------------------------------------------------------------

class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    source: str
    publication_date: Optional[str] = None
    source_url: str
    file_path: Optional[str] = None
    reviewed: bool
    ingestion_status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    analysis: Optional[AIAnalysisResponse] = None


# ---------------------------------------------------------------------------
# Chunk
# ---------------------------------------------------------------------------

class DocumentChunkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    chunk_index: int
    text: str
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    citation_label: str


# ---------------------------------------------------------------------------
# Feedback
# ---------------------------------------------------------------------------

class FeedbackCreate(BaseModel):
    summary_helpful: Optional[bool] = None
    relevance_feedback: Optional[str] = None
    tags_correct: Optional[bool] = None
    action_items_useful: Optional[bool] = None
    comment: Optional[str] = None


class FeedbackResponse(FeedbackCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: int
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Ingestion
# ---------------------------------------------------------------------------

class IngestionRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: str
    documents_found: int
    new_documents_added: int
    error_message: Optional[str] = None


class IngestionStatusItem(BaseModel):
    source: str
    last_run_at: Optional[datetime] = None
    last_status: Optional[str] = None
    new_documents_added: Optional[int] = None


# ---------------------------------------------------------------------------
# Chat / Q&A
# ---------------------------------------------------------------------------

class QuestionRequest(BaseModel):
    question: str


class CitationItem(BaseModel):
    label: str
    text: str
    chunk_index: int
    page_number: Optional[int] = None


class AnswerResponse(BaseModel):
    answer: str
    citations: List[CitationItem] = []


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: int
    role: str
    message: str
    citations: List[CitationItem] = []
    created_at: Optional[datetime] = None

    @field_validator("citations", mode="before")
    @classmethod
    def parse_citations(cls, v: Any) -> List[CitationItem]:
        if v is None:
            return []
        if isinstance(v, list):
            result = []
            for item in v:
                if isinstance(item, CitationItem):
                    result.append(item)
                elif isinstance(item, dict):
                    result.append(CitationItem(**item))
            return result
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return [CitationItem(**item) for item in parsed]
            except Exception:
                pass
        return []


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

class EvaluationMetrics(BaseModel):
    total_feedback: int
    pct_summary_helpful: float
    pct_relevance_correct: float
    pct_tags_correct: float
    pct_action_items_useful: float


# ---------------------------------------------------------------------------
# Misc
# ---------------------------------------------------------------------------

class ReviewToggleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    reviewed: bool


class UploadResponse(BaseModel):
    document_id: int
    title: str
    ingestion_status: str
    message: str
