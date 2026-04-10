# GlomoPay RegWatch

AI-powered regulatory monitoring dashboard for GlomoPay's compliance team. Monitors IFSCA and SEBI publications in real-time, generates AI analysis per document, and provides per-document Q&A with source citations.

## Tech Stack

| Layer       | Technology                                               |
| ----------- | -------------------------------------------------------- |
| Frontend    | React 18 + Vite + TypeScript                             |
| Styling     | Tailwind CSS + shadcn/ui (dark theme)                    |
| Backend     | FastAPI (Python)                                         |
| Database    | SQLite (dev) / PostgreSQL (prod) via SQLAlchemy          |
| PDF Parsing | PyMuPDF                                                  |
| AI          | Gemini / Anthropic Claude / OpenAI / Mock (configurable) |

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
# Edit .env — set AI_PROVIDER and the matching API key

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
npm install
npm run dev
```

Frontend runs at: http://localhost:5173

### 3. Fetch real regulatory data

Once both servers are running, click **"Fetch Latest"** in the navbar to trigger live ingestion from IFSCA and SEBI. Or call the API directly:

```bash
curl -X POST http://localhost:8000/api/ingestion/trigger
```

## AI Configuration

Set `AI_PROVIDER` in `backend/.env`:

| Value       | Description                                                      |
| ----------- | ---------------------------------------------------------------- |
| `mock`      | Default — returns structured placeholder text, no API key needed |
| `gemini`    | Uses Gemini 2.5 Flash, set `GEMINI_API_KEY`                      |
| `anthropic` | Uses Claude claude-3-5-sonnet-20241022, set `ANTHROPIC_API_KEY`  |
| `openai`    | Uses GPT-4o (or `OPENAI_MODEL`), set `OPENAI_API_KEY`            |

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
│   │   ├── base.py              # Abstract connector base class
│   │   ├── ifsca.py             # IFSCA HTML scraper
│   │   └── sebi.py              # SEBI scraper
│   ├── uploads/                 # Stored PDFs
│   ├── seed.py                  # Dev seed data
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── DashboardPage.tsx # Main triage feed
│       │   └── DocumentPage.tsx  # Detail + Q&A
│       ├── components/
│       │   ├── Layout.tsx
│       │   ├── DocumentCard.tsx
│       │   ├── FilterPanel.tsx
│       │   ├── StatsCards.tsx
│       │   ├── IngestionStatus.tsx
│       │   ├── QAPanel.tsx
│       │   ├── FeedbackWidget.tsx
│       │   ├── UploadModal.tsx
│       │   ├── CitationChip.tsx
│       │   ├── EvaluationWidget.tsx
│       │   └── ui/              # shadcn/ui components
│       ├── api/client.ts        # Axios API client
│       └── types/index.ts       # TypeScript interfaces
│
└── docs/
    └── design-decisions.md      # Architecture decisions + future roadmap
```

## Key Features

### Real-time Source Monitoring

- **IFSCA**: HTML scraping of `ifsca.gov.in/Circular`
- **SEBI**: Scraper for SEBI circulars and notifications
- Connector-based architecture — add new sources by creating a file in `connectors/`

### AI Analysis (per document)

- Summary
- "Why it matters to GlomoPay" — LRS/IFSCA/GIFT City context baked into prompts
- Action items
- Tags
- Relevance score (0.0–1.0)

### Per-document Q&A

- Scoped to single-document chunks
- Answers include citation chips (`Page N · Chunk N`)
- Chat history persisted in the database

### Feedback Loop

- Rate: summary helpful, relevance correct, tags accurate, action items useful
- Aggregate quality metrics visible on the document detail page

### Adding a New Regulator

1. Create `backend/connectors/rbi.py` implementing `fetch_publications()` (extend `BaseConnector`)
2. Register it in `CONNECTOR_MAP` in `services/ingestion_service.py`
3. Add to `AVAILABLE_SOURCES` in `routes/ingestion.py`
4. Add to source filter options in `frontend/src/components/FilterPanel.tsx`

## API Reference

| Method | Endpoint                          | Description            |
| ------ | --------------------------------- | ---------------------- |
| GET    | `/api/documents`                  | List with filters      |
| GET    | `/api/documents/stats`            | Dashboard stats        |
| GET    | `/api/documents/{id}`             | Document detail        |
| PATCH  | `/api/documents/{id}/reviewed`    | Toggle reviewed        |
| POST   | `/api/documents/{id}/question`    | Ask a question (Q&A)   |
| POST   | `/api/documents/{id}/feedback`    | Submit feedback        |
| POST   | `/api/documents/{id}/reprocess`   | Re-run AI analysis     |
| DELETE | `/api/documents/{id}/chat`        | Clear chat history     |
| POST   | `/api/upload`                     | Upload PDF             |
| GET    | `/api/evaluation`                 | AI quality metrics     |
| POST   | `/api/ingestion/trigger`          | Trigger all sources    |
| POST   | `/api/ingestion/trigger/{source}` | Trigger one source     |
| GET    | `/api/ingestion/history`          | Ingestion run log      |
| GET    | `/api/ingestion/status`           | Per-source status      |
| POST   | `/api/ingestion/reprocess`        | Reprocess missing docs |

## Deployment

The app is currently designed for local development. For production, three things need to change:

|              | Dev                        | Prod                                                    |
| ------------ | -------------------------- | ------------------------------------------------------- |
| Database     | SQLite file                | PostgreSQL (`DATABASE_URL` env var — already supported) |
| File storage | `./uploads/` local dir     | Persistent volume or S3-compatible object storage       |
| CORS         | Hardcoded `localhost:5173` | Set `CORS_ORIGINS` env var to your domain               |

**Recommended approach**: Single VPS (2 vCPU / 4GB RAM) running Docker Compose with three services — Nginx (reverse proxy + static frontend), FastAPI/Uvicorn, and PostgreSQL. The frontend is built to static files at deploy time (`npm run build`) and served by Nginx directly.

Before going live:

- Add authentication (HTTP Basic Auth via Nginx at minimum, or SSO)
- Switch to Alembic migrations instead of `create_all()` on startup
- Set up daily PostgreSQL backups
- Set `LOG_LEVEL=WARNING` in production

See `docs/design-decisions.md` for full architecture rationale and planned improvements.

## Notes

- SQLite DB is created at `backend/glomopay.db` on first run
- Uploaded PDFs stored in `backend/uploads/`
- Ingestion runs as FastAPI background tasks — non-blocking
- If a PDF can't be downloaded, document metadata is still stored and displayed in the feed
- Live scraping depends on source website structure — connectors may need updates if sites change
