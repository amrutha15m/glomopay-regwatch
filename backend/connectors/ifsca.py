"""
IFSCA connector — fetches circulars via the JSON API.
API: https://ifsca.gov.in/Legal/GetLegalData
"""
import logging
import requests
from datetime import datetime, timedelta, timezone
from typing import Optional
from dateutil import parser as date_parser

logger = logging.getLogger(__name__)

IFSCA_BASE_URL = "https://ifsca.gov.in"
IFSCA_API_URL = "https://ifsca.gov.in/Legal/GetLegalData"
IFSCA_DOWNLOAD_URL = "https://ifsca.gov.in/CommonDirect/DownloadFile"

# EncryptedId from the circulars listing page URL
ENCRYPTED_ID = "wF6kttc1JR8="

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/javascript, */*",
    "Referer": "https://ifsca.gov.in/Legal/Index/wF6kttc1JR8%3D",
}


def _parse_date(date_str: str) -> Optional[str]:
    """Parse DD/MM/YYYY or any date string → YYYY-MM-DD."""
    if not date_str:
        return None
    try:
        return date_parser.parse(date_str.strip(), dayfirst=True).strftime("%Y-%m-%d")
    except Exception:
        return None


def _is_recent(date_str: Optional[str], days: int = 1) -> bool:
    if not date_str:
        return True
    try:
        pub_date = date_parser.parse(date_str, dayfirst=True).date()
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).date()
        return pub_date >= cutoff
    except Exception:
        return True


def fetch_publications() -> list:
    publications = []

    params = {
        "PageNumber": 1,
        "PageSize": 25,
        "SearchText": "",
        "SortCol": "PublishDate",
        "SortType": "desc",
        "EncryptedId": ENCRYPTED_ID,
        "DateFrom": "",
        "DateTo": "",
        "AIlistType": "",
    }

    try:
        logger.info(f"Fetching IFSCA legal data from API")
        resp = requests.get(IFSCA_API_URL, headers=HEADERS, params=params, timeout=30)
        resp.raise_for_status()

        data = resp.json()
        items = data.get("data", {}).get("LegalMasterModelList") or []
        logger.info(f"IFSCA API returned {len(items)} items")

        for item in items:
            title = (item.get("Title") or "").strip()
            file_id = item.get("PhotoFileID") or ""
            file_name = item.get("PhotoFileName") or ""
            publish_date_raw = item.get("PublishDate") or ""

            if not title or not file_id or not file_name:
                continue

            pub_date = _parse_date(publish_date_raw)

            if not _is_recent(publish_date_raw, days=4):
                continue

            pdf_url = f"{IFSCA_DOWNLOAD_URL}?id={file_id}&fileName={file_name}"

            publications.append({
                "title": title[:500],
                "source_url": pdf_url,
                "publication_date": pub_date or datetime.now().strftime("%Y-%m-%d"),
                "pdf_url": pdf_url,
                "description": "",
            })

    except requests.RequestException as e:
        logger.error(f"Network error fetching IFSCA: {e}")
        raise
    except Exception as e:
        logger.error(f"Error fetching IFSCA: {e}")
        raise

    logger.info(f"IFSCA: {len(publications)} publications in last 4 days")
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
