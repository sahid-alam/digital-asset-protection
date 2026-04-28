"""Settings router — read and upsert global application settings."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.supabase import get_supabase

router = APIRouter()

_DEFAULTS: dict = {
    "notification_email": "",
    "detection_threshold": 0.75,
    "auto_crawl": False,
    "email_alerts": True,
}

SETTINGS_ID = "global"


class SettingsBody(BaseModel):
    notification_email: Optional[str] = None
    detection_threshold: Optional[float] = None
    auto_crawl: Optional[bool] = None
    email_alerts: Optional[bool] = None


@router.get("")
def get_settings() -> dict:
    """Return the global settings row, or hardcoded defaults if the table is empty."""
    try:
        resp = get_supabase().table("settings").select("*").eq("id", SETTINGS_ID).execute()
        if resp.data:
            row = resp.data[0]
            return {
                "notification_email": row.get("notification_email", _DEFAULTS["notification_email"]),
                "detection_threshold": row.get("detection_threshold", _DEFAULTS["detection_threshold"]),
                "auto_crawl": row.get("auto_crawl", _DEFAULTS["auto_crawl"]),
                "email_alerts": row.get("email_alerts", _DEFAULTS["email_alerts"]),
            }
    except Exception:
        pass
    return dict(_DEFAULTS)


@router.post("")
def update_settings(body: SettingsBody) -> dict:
    """Upsert the global settings row. Returns the updated settings."""
    current = dict(_DEFAULTS)
    try:
        resp = get_supabase().table("settings").select("*").eq("id", SETTINGS_ID).execute()
        if resp.data:
            row = resp.data[0]
            current = {
                "notification_email": row.get("notification_email", _DEFAULTS["notification_email"]),
                "detection_threshold": row.get("detection_threshold", _DEFAULTS["detection_threshold"]),
                "auto_crawl": row.get("auto_crawl", _DEFAULTS["auto_crawl"]),
                "email_alerts": row.get("email_alerts", _DEFAULTS["email_alerts"]),
            }
    except Exception:
        pass

    updates: dict = {"id": SETTINGS_ID}
    if body.notification_email is not None:
        updates["notification_email"] = body.notification_email
        current["notification_email"] = body.notification_email
    if body.detection_threshold is not None:
        updates["detection_threshold"] = body.detection_threshold
        current["detection_threshold"] = body.detection_threshold
    if body.auto_crawl is not None:
        updates["auto_crawl"] = body.auto_crawl
        current["auto_crawl"] = body.auto_crawl
    if body.email_alerts is not None:
        updates["email_alerts"] = body.email_alerts
        current["email_alerts"] = body.email_alerts

    try:
        get_supabase().table("settings").upsert(updates).execute()
    except Exception:
        # Table may not exist yet; return the merged in-memory result anyway
        pass

    return current
