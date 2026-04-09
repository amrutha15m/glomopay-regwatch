# GlomoPay RegWatch

AI-powered regulatory monitoring dashboard for GlomoPay's compliance team. Monitors IFSCA and RBI publications in real-time, generates AI analysis, and provides per-document Q&A with citations.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui (dark theme) |
| Backend | FastAPI (Python) |
| Database | SQLite via SQLAlchemy |
| PDF Parsing | PyMuPDF |
| AI | Anthropic Claude / OpenAI / Mock (configurable) |

## Quick Start

### 1. Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set AI_PROVIDER and API key if desired

# Seed sample data (optional, for testing without live fetch)
python seed.py

# Start server
python main.py
# or: uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000
API docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: http://localhost:5173

### 3. Fetch real regulatory data

Once both servers are running:
- Click **"Fetch Latest"** in the top-right navbar — triggers live ingestion from IFSCA and RBI
- Or POST to `http://localhost:8000/api/ingestion/trigger`

## AI Configuration

Set `AI_PROVIDER` in `backend/.env`:

| Value | Description |
|-------|-------------|
| `mock` | Default — returns structured placeholder text, no API key needed |
| `anthropic` | Uses Claude claude-3-5-sonnet-20241022, set `ANTHROPIC_API_KEY` |
| `openai` | Uses GPT-4o (or `OPENAI_MODEL`), set `OPENAI_API_KEY` |

## Project Structure

```
glomopay/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── database.py              # SQLAlchemy setup
│   ├── models/models.py         # ORM models
│   ├── schemas/schemas.py       # Pydantic schemas
│   ├── routes/                  # API route handlers
│   │   ├── documents.py         # List, detail, Q&A, review
│   │   ├── ingestion.py         # Trigger & history
│   │   ├── upload.py            # PDF upload
│   │   └── feedback.py          # Feedback & evaluation
│   ├── services/
│   │   ├── ai_service.py        # LLM abstraction layer
│   │   ├── pdf_service.py       # PyMuPDF parsing & chunking
│   │   ├── ingestion_service.py # Orchestration
│   │   └── evaluation_service.py
│   ├── connectors/
│   │   ├── base.py              # Abstract connector
│   │   ├── ifsca.py             # IFSCA scraper
│   │   └── rbi.py               # RBI RSS + HTML
│   ├── uploads/                 # Stored PDFs
│   ├── seed.py                  # Dev seed data
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── DashboardPage.tsx # Main triage feed
        │   └── DocumentPage.tsx  # Detail + Q&A
        ├── components/
        │   ├── Layout.tsx
        │   ├── DocumentCard.tsx
        │   ├── FilterPanel.tsx
        │   ├── StatsCards.tsx
        │   ├── IngestionStatus.tsx
        │   ├── QAPanel.tsx
        │   ├── FeedbackWidget.tsx
        │   ├── UploadModal.tsx
        │   ├── CitationChip.tsx
        │   ├── EvaluationWidget.tsx
        │   └── ui/              # shadcn/ui components
        ├── api/client.ts        # Axios API client
        └── types/index.ts       # TypeScript interfaces
```

## Key Features

### Real Source Monitoring
- **IFSCA**: HTML scraping of `ifsca.gov.in/Circular`
- **RBI**: RSS feeds (`rbi.org.in/scripts/rss.aspx`) with HTML fallback
- Connector-based architecture — add new sources in `connectors/`

### AI Analysis (per document)
- Summary
- "Why it matters to GlomoPay" (LRS/IFSCA/RBI context baked in)
- Action items
- Tags
- Relevance score (0–1)

### Per-document Q&A
- Scoped to single document chunks
- Answers include citation chips (Page N · Chunk N)
- Chat history persisted in DB

### Feedback Loop
- Rate: summary helpful, relevance correct, tags accurate, action items useful
- Aggregate metrics visible on detail page

### Adding a New Regulator
1. Create `backend/connectors/sebi.py` implementing `fetch_publications()`
2. Add to `CONNECTOR_MAP` in `services/ingestion_service.py`
3. Add to `AVAILABLE_SOURCES` in `routes/ingestion.py`
4. Add to source filter options in `frontend/src/components/FilterPanel.tsx`

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List with filters |
| GET | `/api/documents/stats` | Dashboard stats |
| GET | `/api/documents/{id}` | Document detail |
| PATCH | `/api/documents/{id}/reviewed` | Toggle reviewed |
| POST | `/api/documents/{id}/question` | Ask Q&A |
| POST | `/api/documents/{id}/feedback` | Submit feedback |
| POST | `/api/upload` | Upload PDF |
| GET | `/api/evaluation` | AI quality metrics |
| POST | `/api/ingestion/trigger` | Trigger all sources |
| POST | `/api/ingestion/trigger/{source}` | Trigger one source |
| GET | `/api/ingestion/history` | Ingestion log |
| GET | `/api/ingestion/status` | Per-source status |

## Notes

- SQLite DB is created at `backend/glomopay.db` on first run
- Uploaded PDFs stored in `backend/uploads/`
- Ingestion runs in FastAPI background tasks (non-blocking)
- If a PDF can't be downloaded, document metadata is still stored and shown in feed
- Live scraping depends on source website structure — connectors may need updates if sites change
