"""Notification service — Resend email dispatch triggered via BackgroundTasks."""

from __future__ import annotations

import logging

import resend

from app.core.config import settings
from app.core.supabase import get_supabase

logger = logging.getLogger(__name__)


async def send_infringement_alert(infringement_id: str) -> None:
    """Fetch infringement + asset, send alert via Resend. Never raises."""
    try:
        sb = get_supabase()

        inf_resp = sb.table("infringements").select("*").eq("id", infringement_id).execute()
        if not inf_resp.data:
            logger.warning("Infringement %s not found for alert", infringement_id)
            return
        infringement = inf_resp.data[0]

        asset_resp = sb.table("assets").select("*").eq("id", infringement["asset_id"]).execute()
        if not asset_resp.data:
            logger.warning("Asset for infringement %s not found", infringement_id)
            return
        asset = asset_resp.data[0]

        owner_email = asset.get("owner_email")
        if not owner_email:
            return

        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": settings.email_from,
            "to": owner_email,
            "subject": f"Infringement detected: {asset['filename']}",
            "html": (
                f"<p>Potential infringement of <strong>{asset['filename']}</strong> "
                f"detected at <a href='{infringement['source_url']}'>"
                f"{infringement['source_url']}</a> "
                f"(platform: {infringement['platform']}) with confidence score "
                f"{infringement['confidence_score']:.2f}.</p>"
                f"<p>Log in to review and take action.</p>"
            ),
        })
    except Exception as exc:
        logger.error("Failed to send alert for %s: %s", infringement_id, exc)
