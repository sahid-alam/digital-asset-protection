"""Crawler service — Google Custom Search reverse image lookup; mock mode via ENABLE_REAL_CRAWLER."""

from __future__ import annotations

import httpx

from app.core.config import settings


async def crawl_for_matches(asset_id: str, storage_url: str) -> list[dict]:
    """Return list of {"source_url": str, "platform": str}.

    Uses mock data when ENABLE_REAL_CRAWLER=false.
    """
    if not settings.enable_real_crawler:
        return _mock_matches(asset_id)
    return await _real_crawl(storage_url)


def _mock_matches(asset_id: str) -> list[dict]:
    tag = asset_id[:8]
    return [
        {"source_url": f"https://twitter.com/user/status/mock_{tag}", "platform": "twitter"},
        {"source_url": f"https://reddit.com/r/art/comments/mock_{tag}", "platform": "reddit"},
        {"source_url": f"https://www.deviantart.com/mock/art/mock-{tag}", "platform": "deviantart"},
        {"source_url": f"https://instagram.com/p/mock_{tag}", "platform": "instagram"},
        {"source_url": f"https://pinterest.com/pin/mock_{tag}", "platform": "pinterest"},
    ]


async def _real_crawl(image_url: str) -> list[dict]:
    params = {
        "key": settings.google_api_key,
        "cx": settings.google_search_engine_id,
        "searchType": "image",
        "q": image_url,
        "num": 10,
    }
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://www.googleapis.com/customsearch/v1",
            params=params,
            timeout=15,
        )
        if r.status_code != 200:
            return []
        items = r.json().get("items", [])
        return [
            {"source_url": item["link"], "platform": _detect_platform(item["link"])}
            for item in items
        ]


def _detect_platform(url: str) -> str:
    for platform in ["instagram", "twitter", "facebook", "pinterest", "tiktok", "reddit"]:
        if platform in url:
            return platform
    return "unknown"
