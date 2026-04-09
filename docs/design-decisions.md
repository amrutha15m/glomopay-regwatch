# GlomoPay RegWatch — Design Decisions

> Internal document capturing the architectural and UX choices made during the initial build, and areas flagged for future iteration.

---

## What We Built

**RegWatch** is an AI-powered regulatory monitoring dashboard for GlomoPay's compliance team. It automates the discovery, parsing, and analysis of regulatory circulars from Indian financial authorities (IFSCA, SEBI), surfaces AI-generated summaries and action items, and provides a Q&A interface for document-level queries.

The core problem it solves: compliance officers spend significant time manually checking regulator websites, reading dense PDFs, and routing relevant updates to the right internal teams. RegWatch collapses that into a single, opinionated feed with AI pre-analysis.

---

## Architecture Decisions

### Full-Stack Split: FastAPI + React

We chose a clean client-server split rather than a monolith. The backend is a **FastAPI (Python)** REST API, and the frontend is a **React 18 + TypeScript** single-page app built with Vite.

**Why**: The AI workloads (PDF parsing, LLM calls, web scraping) are Python-native. FastAPI gives us async request handling, automatic OpenAPI docs, and Pydantic validation without ceremony. Keeping the frontend decoupled lets us iterate on UI independently of backend processing logic.

### Database: SQLite with SQLAlchemy ORM

We defaulted to SQLite for local development. SQLAlchemy means swapping to PostgreSQL for production is a one-line config change.

**Why**: For an internal tool at this stage, SQLite removes all infrastructure overhead. The data volume (hundreds to low thousands of documents) doesn't justify a separate database server during prototyping.

### AI Provider Abstraction

The AI integration is behind a provider abstraction layer controlled by an `AI_PROVIDER` environment variable. Supported: `mock`, `anthropic`, `openai`, `gemini`.

**Why**: We didn't want to be locked into a single model vendor at this stage. The mock provider allows full development and testing without API costs. Prompts are centralized in `ai_service.py` and encode GlomoPay-specific context (IFSC license scope, relevant regulatory regimes) so analysis is domain-appropriate regardless of which model handles it.

### Connector Pattern for Regulatory Sources

Each regulatory source (IFSCA, SEBI) is implemented as a class extending a common abstract base. Adding a new source (e.g., RBI) means creating one new file implementing `fetch_publications()`.

**Why**: Regulatory monitoring inherently expands over time. The connector pattern makes this extensible without touching core ingestion logic.

### Chunking Strategy

PDF text is extracted page-by-page using PyMuPDF, then chunked at ~800-word boundaries with paragraph-level awareness. Each chunk gets a human-readable citation label (`Page N · Chunk M`).

**Why**: The Q&A feature needs chunk-level retrieval to surface relevant passages. Page-aware chunking ensures citations are accurate and meaningful to a human reading the original document. The 800-word target is a practical compromise between context richness and LLM token limits.

### Async Background Tasks

Ingestion (fetching, downloading, parsing, AI analysis) runs as a FastAPI background task, non-blocking to the request.

**Why**: A single ingestion run hitting multiple sources, downloading PDFs, and calling an LLM can take minutes. Making this async means the UI can show a progress indicator without holding an HTTP connection open.

---

## Frontend Decisions

### State Management: Hooks Only

We used React's built-in `useState` and `useEffect` for all state. No Redux, no Zustand, no Context API.

**Why**: The app has two main pages and a relatively linear data flow. Document list state lives in DashboardPage; document detail state lives in DocumentPage. Props and callbacks handle coordination between parent and child components. A global store would have added complexity without clear benefit at this scope.

### Component Library: shadcn/ui + Tailwind

We used shadcn/ui (Radix UI primitives + Tailwind-styled components) as the base component system.

**Why**: shadcn/ui gives us accessible, unstyled-by-default components we can fully customize. We're not buying into a rigid design system we'd have to fight — we own the component code. Tailwind handles the rest.

### Dark Theme

The interface is fixed to dark mode (`bg-slate-950` base, slate/zinc scale for surfaces).

**Why**: Compliance teams frequently work in dense information environments for long stretches. Dark mode reduces eye strain and gives the product a distinct, focused character appropriate for a monitoring tool rather than a consumer app.

### Dashboard: Stats Cards + Filter Panel + Document List

The dashboard is structured as a three-zone layout:
1. **Stats cards** — aggregated counts (Total, Reviewed, Awaiting Review, High Relevance), each clickable as a quick filter
2. **Filter panel** — search + source, review status, relevance tier, date range
3. **Document list** — paginated cards with source badge, relevance score, summary preview, and tags

**Why**: The stats cards serve dual purpose — they communicate the state of the inbox at a glance, and they function as one-click shortcuts into the most common views (e.g., "show me just the high-relevance unreviewed items"). The filter panel is deliberately more granular for power use.

### Document Detail: Linear Single-Column Layout

The document detail page presents everything in a scrollable single column: metadata → AI analysis → document chunks → Q&A chat → feedback form.

**Why**: Compliance review is a linear workflow. A reader arrives, reads the summary, decides whether to dig into the full document or ask a question, then either marks it reviewed or submits feedback. A single-column layout mirrors that reading order. Sections that aren't always needed (chunks, chat, evaluation metrics) are hidden behind toggles.

### Q&A Panel: In-Page Chat

The document Q&A is embedded in the document detail page as a collapsible panel, not a separate page or modal.

**Why**: Questions about a document need to be asked while looking at the document context. Keeping Q&A in-page means a user can scroll between the analysis summary and their conversation without losing context. Citations surface as chips that reference specific chunks, so users can trace answers back to the source text.

### Feedback Widget: Structured + Open-Ended

The feedback form collects four structured signals (summary helpfulness, relevance accuracy, tag accuracy, action item usefulness) as toggle pairs or three-way selectors, plus a freetext comment field.

**Why**: Structured fields let us aggregate and trend AI quality metrics automatically. Freetext captures nuance the structured fields miss. Together they form a lightweight RLHF-style loop — compliance officer judgment feeds back into measuring and eventually improving the AI output.

---

## What We'd Like to Change

These are areas where the current implementation makes reasonable first-pass choices, but we've identified limitations that should drive the next iteration.

### 1. Chat History Persistence

**Current state**: Chat messages for each document are stored in the database and loaded with the document detail page. The Q&A panel shows the full message history for that document.

**Problem**: There's no way to browse or search across conversations. If a user asked a question about a document last week, finding that exchange requires navigating back to the same document. There's also no concept of sessions — all Q&A is merged into a single flat history per document.

**Direction**: Introduce a conversation history view — either as a sidebar on the dashboard or a dedicated page — where users can browse past Q&A sessions across documents, search by keyword, and jump back to the document context. Consider session boundaries (time-gated or user-initiated) so conversations from different review sessions are distinct.

### 2. Card Design and Information Hierarchy

**Current state**: Document cards show source badge, relevance score, title (2-line clamp), summary preview (2-line clamp), tags (first 3 + overflow), and date. Stats cards at the top are simple count displays.

**Problem**: The current card layout doesn't differentiate urgency well. A high-relevance unreviewed document from today looks similar to a low-relevance archived one. The stats cards feel disconnected from the document list — clicking them filters, but the transition isn't obvious. The "awaiting review" concept and "high relevance" concept are mixed in the filter system without a clear primary sort order.

**Direction**: Rethink cards to create stronger visual hierarchy. Consider a primary status indicator (unreviewed + high relevance = urgent; reviewed = archived). Explore separating documents into explicit lanes (e.g., inbox / reviewed / archived). Revisit whether summary preview belongs on the card at all, or whether the title, relevance score, and action item count are more useful at the list level. Stats cards should feel like live filters — consider making their active state more prominent when selected.

### 3. Feedback Mechanism

**Current state**: The feedback widget is a form at the bottom of the document detail page. It requires scrolling past the Q&A panel to reach. Each submission creates a new feedback record; there's no way to edit or update a previous submission. The evaluation metrics are hidden behind a separate toggle.

**Problem**: The placement makes feedback feel like an afterthought. Users who mark a document reviewed and close the tab never see the feedback form. The structured fields (summary helpful, relevance correct, tags accurate, action items useful) are presented as parallel questions without a sense of which matters most. There's no in-context feedback — you can't flag a specific part of the AI output as wrong while you're reading it.

**Direction**: Consider inline feedback — small thumbs-up/down controls directly on each AI output section (summary, relevance score, tags, action items) that capture signal without requiring a full form interaction. Treat the review action itself as an implicit positive feedback signal. Reserve the detailed form for cases where something is wrong or needs commentary. Move evaluation metrics out of a hidden toggle and into a persistent quality signal visible to the team.

### 4. Tag Editing

**Current state**: Tags are generated by the AI and displayed as read-only chips on both the document card (first 3 + overflow) and the document detail page. The "tags accurate?" feedback field captures a binary signal but doesn't let users correct the tags.

**Problem**: The AI will sometimes generate tags that are too broad, too narrow, or just wrong. Compliance officers often know better — they have institutional knowledge about which tags matter for routing and search. The current system has no way to surface that knowledge back into the data.

**Direction**: Make tags editable on the document detail page. Allow users to remove AI-generated tags and add their own. Consider a tag taxonomy (predefined set the team maintains) alongside freeform tags. Track which tags were AI-generated vs. human-edited, and use that signal to improve prompt quality over time. Edited tags should immediately be searchable and filterable on the dashboard.

---

*Document created April 2026. Reflects the state of the initial RegWatch build.*
