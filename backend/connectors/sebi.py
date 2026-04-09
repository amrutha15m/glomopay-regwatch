"""
SEBI connector — fetches circulars from SEBI listing page.
Listing: https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=1&smid=0&ssid=7
"""
import re
import logging
import requests
from datetime import datetime, timedelta, timezone
from typing import Optional
from bs4 import BeautifulSoup
from dateutil import parser as date_parser

logger = logging.getLogger(__name__)

SEBI_BASE_URL = "https://www.sebi.gov.in"
SEBI_LISTING_URL = (
    "https://www.sebi.gov.in/sebiweb/home/HomeAction.do"
    "?doListing=yes&sid=1&smid=0&ssid=7"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

# Regex to find SEBI PDF paths in raw HTML source
_PDF_RE = re.compile(
    r'(?:src|href|data)["\s]*(?:=|:)["\s]*((?:/sebi_data/attachdocs/[^\s"\'<>]+\.pdf))',
    re.IGNORECASE,
)
_PDF_RE_BARE = re.compile(
    r'(https?://(?:www\.)?sebi\.gov\.in/sebi_data/attachdocs/[^\s"\'<>]+\.pdf)',
    re.IGNORECASE,
)


def _parse_date(date_str: str) -> Optional[str]:
    if not date_str:
        return None
    try:
        return date_parser.parse(date_str.strip()).strftime("%Y-%m-%d")
    except Exception:
        return None


def _extract_pdf_url(page_url: str) -> Optional[str]:
    """Fetch the circular HTML page and extract the embedded PDF URL."""
    try:
        resp = requests.get(page_url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        raw = resp.text

        # Try attribute pattern first (src=, href=, data=)
        m = _PDF_RE.search(raw)
        if m:
            path = m.group(1)
            return path if path.startswith("http") else SEBI_BASE_URL + path

        # Try bare absolute URL
        m = _PDF_RE_BARE.search(raw)
        if m:
            return m.group(1)

    except Exception as e:
        logger.warning(f"Could not extract PDF from {page_url}: {e}")

    return None


def _is_recent(date_str: Optional[str], days: int = 1) -> bool:
    if not date_str:
        return True
    try:
        pub_date = date_parser.parse(date_str).date()
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).date()
        return pub_date >= cutoff
    except Exception:
        return True


def fetch_publications() -> list:
    publications = []

    try:
        logger.info(f"Fetching SEBI circulars from {SEBI_LISTING_URL}")
        resp = requests.get(SEBI_LISTING_URL, headers=HEADERS, timeout=30)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.content, "lxml")
        seen_urls = set()

        # The listing page renders a table: each row has a date cell and a title link
        for row in soup.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) < 2:
                continue

            # First cell: date; second cell: title link
            date_text = cells[0].get_text(strip=True)
            link_tag = cells[1].find("a", href=True)

            if not link_tag:
                continue

            title = link_tag.get_text(strip=True)
            href = link_tag["href"].strip()

            if not title or len(title) < 5:
                continue

            full_url = SEBI_BASE_URL + href if href.startswith("/") else href

            if full_url in seen_urls:
                continue

            pub_date = _parse_date(date_text)

            if not _is_recent(pub_date, days=4):
                continue

            pub_date_final = pub_date or datetime.now().strftime("%Y-%m-%d")

            # Try to get the actual PDF URL from inside the circular page.
            # Use PDF URL as source_url so the ingestion service downloads
            # and parses the real document rather than the HTML shell.
            pdf_url = _extract_pdf_url(full_url)
            source_url = pdf_url if pdf_url else full_url

            publications.append({
                "title": title[:500],
                "source_url": source_url,
                "publication_date": pub_date_final,
                "pdf_url": pdf_url,
                "description": "",
            })
            seen_urls.add(full_url)

    except requests.RequestException as e:
        logger.error(f"Network error fetching SEBI: {e}")
        raise
    except Exception as e:
        logger.error(f"Error fetching SEBI: {e}")
        raise

    logger.info(f"SEBI: found {len(publications)} publications in last 4 days")
    return publications[:20]


def normalize_publication(pub: dict) -> dict:
    return pub


def download_document(url: str) -> Optional[bytes]:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        return resp.content
    except Exception as e:
        logger.warning(f"Failed to download SEBI document {url}: {e}")
        return None
