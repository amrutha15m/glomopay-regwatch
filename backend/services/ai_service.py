"""
Abstract AI service for GlomoPay RegWatch.
Provider swapped via AI_PROVIDER env var: mock | gemini | anthropic | openai
All prompts defined here for easy editing.
"""
import os
import json
import re
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

AI_PROVIDER = os.getenv("AI_PROVIDER", "mock")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")

GLOMOPAY_CONTEXT = """
GlomoPay is an IFSC-licensed payment institution operating in GIFT City, India.
It handles outward remittances under the Liberalised Remittance Scheme (LRS).
Key regulatory exposures:
- IFSCA regulations for IFSC units
- RBI/FEMA guidelines for cross-border payments and LRS
- AML/CFT obligations and sanctions screening
- KYC and customer due diligence
- Transaction reporting obligations
- Correspondent banking arrangements
Core operations: remittance processing, KYC onboarding, transaction monitoring, regulatory reporting.
"""

# ============================================================
# PROMPTS
# ============================================================

def _title_prompt(text: str) -> str:
    return f"""Extract the official title of this regulatory document. Return only the title — no explanation, no punctuation around it.

Document:
{text[:3000]}

Title:"""


def _summary_prompt(text: str) -> str:
    return f"""You are a regulatory compliance expert. Summarize this regulatory document in 3-5 clear sentences for a compliance officer. Focus on what the regulation requires, who it applies to, and key deadlines.

Document:
{text[:8000]}

Provide only the summary."""


def _why_it_matters_prompt(text: str) -> str:
    return f"""You are a compliance expert advising GlomoPay.

{GLOMOPAY_CONTEXT}

Explain in 3-4 sentences why this regulatory document is relevant to GlomoPay. Be specific about which operations (LRS remittances, KYC, AML controls, reporting) are affected.

Document:
{text[:8000]}

Provide only the explanation."""


def _action_items_prompt(text: str) -> str:
    return f"""You are a compliance expert advising GlomoPay.

{GLOMOPAY_CONTEXT}

List 3-6 specific, actionable items GlomoPay's compliance team should act on based on this document.

Document:
{text[:8000]}

Return ONLY a valid JSON array of strings, e.g.: ["Review LRS limits", "Update KYC policy"]"""


def _tags_prompt(text: str) -> str:
    return f"""Extract 4-8 relevant compliance tags for this regulatory document.
Use terms like: AML, CFT, KYC, LRS, FEMA, IFSCA, RBI, SEBI, Remittance, Sanctions, Reporting, Transaction Monitoring, Capital Account, Cross-Border, Payment, Licensing, Audit, Risk, Correspondent Banking.

Document:
{text[:4000]}

Return ONLY a valid JSON array of strings, e.g.: ["AML", "KYC", "LRS"]"""


def _relevance_score_prompt(text: str) -> str:
    return f"""Rate the relevance of this regulatory document to GlomoPay's operations (0.0-1.0).
- 0.9-1.0: Directly applicable, requires immediate action
- 0.7-0.9: Highly relevant, likely requires changes
- 0.5-0.7: Moderately relevant, monitor closely
- 0.3-0.5: Somewhat relevant
- 0.0-0.3: Low relevance

{GLOMOPAY_CONTEXT}

Document:
{text[:4000]}

Return ONLY a float between 0.0 and 1.0."""


def _qa_prompt(question: str, context_chunks: list) -> str:
    context = "\n\n".join([
        f"[{c['citation_label']}]\n{c['text']}"
        for c in context_chunks
    ])
    return f"""You are a regulatory compliance expert. Answer based ONLY on the document excerpts provided. Cite excerpts using their labels.

Question: {question}

Document excerpts:
{context}

Provide a clear answer and note which excerpts you cited as: Sources: [citation label]"""


# ============================================================
# PROVIDERS
# ============================================================

def _call_mock(prompt: str) -> str:
    if "Title:" in prompt and "Extract the official title" in prompt:
        return "Regulatory Circular"
    if "JSON array" in prompt and "tags" in prompt.lower():
        return '["AML", "KYC", "Compliance", "Regulatory"]'
    if "JSON array" in prompt and "action" in prompt.lower():
        return '["Review compliance framework", "Update internal policies", "Schedule team training", "File regulatory acknowledgment"]'
    if "0.0-1.0" in prompt or "float" in prompt:
        return "0.75"
    if "why" in prompt.lower() and "glomopay" in prompt.lower():
        return "This regulation directly affects GlomoPay's remittance operations under LRS. GlomoPay must review its KYC and AML controls to ensure alignment. The compliance team should assess impact on correspondent banking arrangements and update transaction monitoring thresholds."
    return "This regulatory document establishes updated compliance requirements for payment institutions. The regulation sets out key obligations and timelines for implementation. Compliance teams should review applicable sections and assess internal policy alignment."


def _call_gemini(prompt: str) -> str:
    from google import genai
    client = genai.Client(api_key=GEMINI_API_KEY)
    response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
    return response.text


def _call_anthropic(prompt: str) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text


def _call_openai(prompt: str) -> str:
    from openai import OpenAI
    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1024,
        temperature=0.3,
    )
    return response.choices[0].message.content


def _call_llm(prompt: str) -> str:
    try:
        if AI_PROVIDER == "gemini" and GEMINI_API_KEY:
            return _call_gemini(prompt)
        elif AI_PROVIDER == "anthropic" and ANTHROPIC_API_KEY:
            return _call_anthropic(prompt)
        elif AI_PROVIDER == "openai" and OPENAI_API_KEY:
            return _call_openai(prompt)
        else:
            if AI_PROVIDER not in ("mock", ""):
                logger.warning(f"AI_PROVIDER={AI_PROVIDER} but no API key found. Using mock.")
            return _call_mock(prompt)
    except Exception as e:
        logger.error(f"LLM call failed: {e}. Falling back to mock.")
        return _call_mock(prompt)


# ============================================================
# PUBLIC INTERFACE
# ============================================================

def generate_title(text: str) -> str:
    if not text or len(text.strip()) < 20:
        return ""
    return _call_llm(_title_prompt(text)).strip()


def generate_summary(text: str) -> str:
    if not text or len(text.strip()) < 50:
        return "Document text not available for analysis."
    return _call_llm(_summary_prompt(text))


def generate_why_it_matters(text: str) -> str:
    if not text or len(text.strip()) < 50:
        return "Document text not available for analysis."
    return _call_llm(_why_it_matters_prompt(text))


def generate_action_items(text: str) -> list:
    if not text or len(text.strip()) < 50:
        return ["Review document when full text is available"]
    raw = _call_llm(_action_items_prompt(text))
    try:
        start = raw.find('[')
        end = raw.rfind(']') + 1
        if start >= 0 and end > start:
            return json.loads(raw[start:end])
    except Exception:
        pass
    return ["Review document for compliance implications", "Assess operational impact", "Update internal policies"]


def generate_tags(text: str) -> list:
    if not text or len(text.strip()) < 50:
        return ["Regulatory"]
    raw = _call_llm(_tags_prompt(text))
    try:
        start = raw.find('[')
        end = raw.rfind(']') + 1
        if start >= 0 and end > start:
            return json.loads(raw[start:end])
    except Exception:
        pass
    return ["Regulatory", "Compliance"]


def generate_relevance_score(text: str) -> float:
    if not text or len(text.strip()) < 50:
        return 0.5
    raw = _call_llm(_relevance_score_prompt(text))
    try:
        match = re.search(r'\b(0?\.\d+|1\.0|1|0)\b', raw)
        if match:
            return max(0.0, min(1.0, float(match.group())))
    except Exception:
        pass
    return 0.5


def generate_full_analysis(text: str) -> dict:
    return {
        "summary": generate_summary(text),
        "why_it_matters": generate_why_it_matters(text),
        "action_items": generate_action_items(text),
        "tags": generate_tags(text),
        "relevance_score": generate_relevance_score(text),
    }


_GENERAL_GREETINGS = {"hello", "hi", "hey", "howdy", "greetings", "sup", "yo"}
_GENERAL_HELP = {"help", "what can you do", "how does this work", "what are you", "who are you", "capabilities"}
_GENERAL_SOURCE = {"view source", "source code", "show source", "see source", "open source"}
_GENERAL_ABOUT = {"what is this", "what is glomopay", "about this", "about glomopay", "explain this app"}


def _classify_general_question(question: str) -> str | None:
    q = question.lower().strip().rstrip("?!")
    if q in _GENERAL_GREETINGS or any(q.startswith(g) for g in _GENERAL_GREETINGS):
        return "greeting"
    if any(phrase in q for phrase in _GENERAL_HELP):
        return "help"
    if any(phrase in q for phrase in _GENERAL_SOURCE):
        return "source"
    if any(phrase in q for phrase in _GENERAL_ABOUT):
        return "about"
    return None


_GENERAL_RESPONSES = {
    "greeting": (
        "Hello! I'm the GlomoPay RegWatch AI assistant. I can help you understand this regulatory document — "
        "answering questions about compliance requirements, key obligations, deadlines, and how they affect GlomoPay's operations. "
        "What would you like to know?"
    ),
    "help": (
        "Here's what I can help you with:\n"
        "• Answer questions about this regulatory document\n"
        "• Identify compliance obligations and deadlines\n"
        "• Explain how the regulation affects GlomoPay's operations\n"
        "• Find specific sections with citations\n\n"
        "Just type your question and I'll search the document for the most relevant answer."
    ),
    "source": (
        "GlomoPay RegWatch is built with React + TypeScript (frontend) and Python/FastAPI (backend). "
        "The AI layer supports multiple providers: Gemini, Anthropic Claude, and OpenAI — switchable via the AI_PROVIDER environment variable. "
        "Document processing uses chunked text extraction with citation tracking."
    ),
    "about": (
        "GlomoPay RegWatch is a regulatory intelligence platform for GlomoPay — an IFSC-licensed payment institution in GIFT City, India. "
        "It helps compliance teams track, analyze, and act on regulatory updates from RBI, IFSCA, SEBI, and other bodies. "
        "Each document is auto-analyzed for relevance, key action items, and compliance implications."
    ),
}


def answer_document_question(question: str, chunks: list) -> dict:
    category = _classify_general_question(question)
    if category:
        return {"answer": _GENERAL_RESPONSES[category], "citations": []}

    if not chunks:
        return {"answer": "No document content available to search.", "citations": []}

    question_words = set(question.lower().split())
    scored = []
    for chunk in chunks:
        score = len(question_words & set(chunk['text'].lower().split()))
        scored.append((score, chunk))
    scored.sort(key=lambda x: x[0], reverse=True)
    top_chunks = [c for _, c in scored[:5]]

    answer_text = _call_llm(_qa_prompt(question, top_chunks))

    cited_labels = re.findall(r'\[([^\]]+)\]', answer_text)
    citations = []
    for chunk in top_chunks:
        if any(chunk['citation_label'] in label or label in chunk['citation_label'] for label in cited_labels):
            citations.append({
                "label": chunk['citation_label'],
                "text": chunk['text'][:300],
                "chunk_index": chunk['chunk_index'],
                "page_number": chunk.get('page_number'),
            })

    if not citations and top_chunks:
        c = top_chunks[0]
        citations.append({
            "label": c['citation_label'],
            "text": c['text'][:300],
            "chunk_index": c['chunk_index'],
            "page_number": c.get('page_number'),
        })

    return {"answer": answer_text, "citations": citations}
