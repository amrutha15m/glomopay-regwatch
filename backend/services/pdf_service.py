"""PDF parsing and chunking service using PyMuPDF."""
import logging
from typing import Optional
import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

CHUNK_SIZE = 800


def extract_text_from_pdf(file_path: str) -> Optional[str]:
    try:
        doc = fitz.open(file_path)
        pages_text = []
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text("text")
            if text.strip():
                pages_text.append(f"--- Page {page_num + 1} ---\n{text.strip()}")
        doc.close()
        return "\n\n".join(pages_text) if pages_text else None
    except Exception as e:
        logger.error(f"Failed to extract text from {file_path}: {e}")
        return None


def get_page_text_map(file_path: str) -> dict:
    result = {}
    try:
        doc = fitz.open(file_path)
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text("text").strip()
            if text:
                result[page_num + 1] = text
        doc.close()
    except Exception as e:
        logger.error(f"Failed to get page map from {file_path}: {e}")
    return result


def chunk_text_by_page(file_path: str) -> list:
    page_map = get_page_text_map(file_path)
    chunks = []
    chunk_index = 0

    for page_num in sorted(page_map.keys()):
        page_text = page_map[page_num]
        paragraphs = [p.strip() for p in page_text.split('\n\n') if p.strip()]
        current_chunk = ""

        for para in paragraphs:
            if len(current_chunk) + len(para) < CHUNK_SIZE:
                current_chunk += ("\n\n" if current_chunk else "") + para
            else:
                if current_chunk:
                    chunks.append({
                        "chunk_index": chunk_index,
                        "text": current_chunk,
                        "page_number": page_num,
                        "section_title": None,
                        "citation_label": f"Page {page_num} · Chunk {chunk_index + 1}",
                    })
                    chunk_index += 1
                current_chunk = para

        if current_chunk:
            chunks.append({
                "chunk_index": chunk_index,
                "text": current_chunk,
                "page_number": page_num,
                "section_title": None,
                "citation_label": f"Page {page_num} · Chunk {chunk_index + 1}",
            })
            chunk_index += 1

    return chunks


def chunk_text_simple(text: str) -> list:
    if not text:
        return []

    chunks = []
    chunk_index = 0
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    current_chunk = ""
    current_page = 1

    for para in paragraphs:
        if para.startswith("--- Page") and "---" in para[4:]:
            try:
                current_page = int(para.replace("---", "").replace("Page", "").strip())
            except Exception:
                pass
            continue

        if len(current_chunk) + len(para) < CHUNK_SIZE:
            current_chunk += ("\n\n" if current_chunk else "") + para
        else:
            if current_chunk:
                chunks.append({
                    "chunk_index": chunk_index,
                    "text": current_chunk,
                    "page_number": current_page,
                    "section_title": None,
                    "citation_label": f"Page {current_page} · Chunk {chunk_index + 1}",
                })
                chunk_index += 1
            current_chunk = para

    if current_chunk:
        chunks.append({
            "chunk_index": chunk_index,
            "text": current_chunk,
            "page_number": current_page,
            "section_title": None,
            "citation_label": f"Page {current_page} · Chunk {chunk_index + 1}",
        })

    return chunks
