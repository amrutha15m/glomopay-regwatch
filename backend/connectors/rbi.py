"""
RBI connector — fetches via RSS feeds (primary) and HTML fallback.
RSS feeds: https://www.rbi.org.in/scripts/rss.aspx
"""
import re
import logging
import feedparser
import requests
from datetime import datetime
from typing import Optional
from bs4 import BeautifulSoup
from dateutil import parser as date_parser

logger = logging.getLogger(__name__)

RBI_BASE_URL = "https://www.rbi.org.in"

RBI_RSS_FEEDS = [
    ("https://www.rbi.org.in/scripts/rss.aspx?Id=8", "Notifications"),
    ("https://www.rbi.org.in/scripts/rss.aspx?Id=7", "Circulars"),
    ("https://www.rbi.org.in/scripts/rss.aspx?Id=37", "Press Releases"),
]

RBI_LISTING_PAGES = [
    "https://www.rbi.org.in/Scripts/BS_CircularIndexDisplay.aspx",
    "https://www.rbi.org.in/Scripts/NotificationUser.aspx",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def _parse_date(date_str: str) -> Optional[str]:
    if not date_str:
        return None
    try:
        return date_parser.parse(date_str.strip(), dayfirst=True).strftime("%Y-%m-%d")
    except Exception:
        return None


def _fetch_from_rss() -> list:
    publications = []

    for feed_url, feed_type in RBI_RSS_FEEDS:
        try:
            logger.info(f"Fetching RBI RSS: {feed_url}")
            feed = feedparser.parse(feed_url)

            if not feed.entries:
                logger.warning(f"Empty RBI RSS feed: {feed_url}")
                continue

            for entry in feed.entries[:15]:
                title = entry.get("title", "").strip()
                link = entry.get("link", "").strip()
                if not title or not link:
                    continue

                pub_date = None
                for attr in ("published", "updated"):
                    val = getattr(entry, attr, None)
                    if val:
                        pub_date = _parse_date(val)
                        break

                if link.startswith("/"):
                    link = RBI_BASE_URL + link

                pdf_url = link if ".pdf" in link.lower() else None

                pub = {
                    "title": title[:500],
                    "source_url": link,
                    "publication_date": pub_date or datetime.now().strftime("%Y-%m-%d"),
                    "pdf_url": pdf_url,
                    "description": entry.get("summary", "")[:500],
                }

                if not any(p["source_url"] == link for p in publications):
                    publications.append(pub)

        except Exception as e:
            logger.warning(f"Error fetching RBI RSS {feed_url}: {e}")
            continue

    return publications


def _fetch_from_html() -> list:
    publications = []

    for page_url in RBI_LISTING_PAGES:
        try:
            logger.info(f"Fetching RBI HTML: {page_url}")
            resp = requests.get(page_url, headers=HEADERS, timeout=30)
            resp.raise_for_status()

            soup = BeautifulSoup(resp.content, "lxml")
            seen = set()

            for link in soup.find_all("a", href=True):
                href = link.get("href", "")
                title = link.get_text(strip=True)

                if not title or len(title) < 10:
                    continue

                if href.startswith("http"):
                    full_url = href
                elif href.startswith("/"):
                    full_url = RBI_BASE_URL + href
                else:
                    full_url = RBI_BASE_URL + "/" + href

                if full_url in seen:
                    continue

                parent = link.parent
                row_text = parent.get_text(separator=" ", strip=True) if parent else title

                date_str = None
                for pattern in [r'\d{1,2}[/-]\d{1,2}[/-]\d{4}', r'\w+ \d{1,2}, \d{4}', r'\d{1,2} \w+ \d{4}']:
                    match = re.search(pattern, row_text)
                    if match:
                        date_str = _parse_date(match.group())
                        break

                pub = {
                    "title": title[:500],
                    "source_url": full_url,
                    "publication_date": date_str or datetime.now().strftime("%Y-%m-%d"),
                    "pdf_url": full_url if ".pdf" in full_url.lower() else None,
                    "description": "",
                }

                if not any(p["source_url"] == full_url for p in publications):
                    publications.append(pub)
                seen.add(full_url)

        except Exception as e:
            logger.warning(f"Error fetching RBI HTML {page_url}: {e}")
            continue

    return publications


def fetch_publications() -> list:
    publications = _fetch_from_rss()

    if len(publications) < 3:
        logger.warning("RSS returned few results, trying HTML fallback")
        html_pubs = _fetch_from_html()
        for p in html_pubs:
            if not any(x["source_url"] == p["source_url"] for x in publications):
                publications.append(p)

    logger.info(f"RBI: found {len(publications)} total publications")
    return publications[:20]


def normalize_publication(pub: dict) -> dict:
    return pub


def download_document(url: str) -> Optional[bytes]:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        return resp.content
    except Exception as e:
        logger.warning(f"Failed to download RBI document {url}: {e}")
        return None
