"""
IFSCA connector — fetches circulars from https://ifsca.gov.in
"""
import re
import logging
import requests
from datetime import datetime
from typing import Optional
from bs4 import BeautifulSoup
from dateutil import parser as date_parser

logger = logging.getLogger(__name__)

IFSCA_CIRCULARS_URL = "https://ifsca.gov.in/Circular"
IFSCA_BASE_URL = "https://ifsca.gov.in"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

DATE_PATTERNS = [
    r'\d{1,2}[/-]\d{1,2}[/-]\d{4}',
    r'\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}',
    r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}',
]

SKIP_TITLES = {"home", "about", "contact", "sitemap", "search", "login", "register"}
DOC_KEYWORDS = {"circular", "notification", "guideline", "regulation", "direction", "framework", "order", "gazette"}


def _parse_date(date_str: str) -> Optional[str]:
    if not date_str:
        return None
    try:
        return date_parser.parse(date_str.strip(), dayfirst=True).strftime("%Y-%m-%d")
    except Exception:
        return None


def _extract_date_from_text(text: str) -> Optional[str]:
    for pattern in DATE_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            result = _parse_date(match.group())
            if result:
                return result
    return None


def fetch_publications() -> list:
    publications = []

    try:
        logger.info(f"Fetching IFSCA circulars from {IFSCA_CIRCULARS_URL}")
        resp = requests.get(IFSCA_CIRCULARS_URL, headers=HEADERS, timeout=30)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.content, "lxml")

        # Try tables first, then any anchors in the main content
        seen_urls = set()

        for link in soup.find_all("a", href=True):
            href = link.get("href", "").strip()
            title = link.get_text(strip=True)

            if not title or len(title) < 10:
                continue
            if title.lower() in SKIP_TITLES:
                continue
            if not href:
                continue

            # Build full URL
            if href.startswith("http"):
                full_url = href
            elif href.startswith("/"):
                full_url = IFSCA_BASE_URL + href
            else:
                full_url = IFSCA_BASE_URL + "/" + href

            if full_url in seen_urls:
                continue

            # Only keep circular-like links
            url_lower = full_url.lower()
            title_lower = title.lower()
            is_relevant = (
                ".pdf" in url_lower or
                "circular" in url_lower or
                "notification" in url_lower or
                any(kw in title_lower for kw in DOC_KEYWORDS)
            )
            if not is_relevant:
                continue

            # Extract date from surrounding context
            parent = link.parent
            row_text = parent.get_text(separator=" ", strip=True) if parent else title
            pub_date = _extract_date_from_text(row_text) or datetime.now().strftime("%Y-%m-%d")

            pdf_url = full_url if ".pdf" in url_lower else None

            publications.append({
                "title": title[:500],
                "source_url": full_url,
                "publication_date": pub_date,
                "pdf_url": pdf_url,
                "description": "",
            })
            seen_urls.add(full_url)

        logger.info(f"IFSCA: found {len(publications)} publications")

    except requests.RequestException as e:
        logger.error(f"Network error fetching IFSCA: {e}")
        raise
    except Exception as e:
        logger.error(f"Error fetching IFSCA: {e}")
        raise

    return publications[:20]


def normalize_publication(pub: dict) -> dict:
    return pub


def download_document(url: str) -> Optional[bytes]:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        return resp.content
    except Exception as e:
        logger.warning(f"Failed to download IFSCA document {url}: {e}")
        return None
