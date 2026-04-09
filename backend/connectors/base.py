"""Base connector interface for regulatory source fetchers."""
from abc import ABC, abstractmethod
from typing import Optional


class BaseConnector(ABC):
    source_name: str = ""
    base_url: str = ""

    @abstractmethod
    def fetch_publications(self) -> list:
        """
        Returns list of dicts:
        - title (str, required)
        - source_url (str, required)
        - publication_date (str, optional) ISO YYYY-MM-DD
        - pdf_url (str, optional)
        - description (str, optional)
        """
        pass

    def normalize_publication(self, raw: dict) -> dict:
        return {
            "title": raw.get("title", "Untitled").strip(),
            "source_url": raw.get("source_url", raw.get("url", "")).strip(),
            "publication_date": raw.get("publication_date", raw.get("date")),
            "pdf_url": raw.get("pdf_url"),
            "description": raw.get("description", ""),
        }

    def download_document(self, url: str) -> Optional[bytes]:
        import requests
        try:
            headers = {"User-Agent": "Mozilla/5.0 (compatible; GlomoPay-RegWatch/1.0)"}
            resp = requests.get(url, headers=headers, timeout=30)
            resp.raise_for_status()
            return resp.content
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Failed to download {url}: {e}")
            return None
