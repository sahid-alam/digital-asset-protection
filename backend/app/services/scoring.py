"""Scoring service — confidence score computation and analytics aggregation."""

from __future__ import annotations

from typing import Optional

from app.core.supabase import get_supabase


def compute_confidence_score(
    clip_score: float,
    phash_distance: Optional[int],
    vision_api_hit: bool,
    domain_trust: float = 0.5,
) -> float:
    """Weighted confidence: 0.50*clip + 0.25*phash + 0.15*vision + 0.10*trust.

    phash component is 0 when phash_distance is None (document assets).
    Returns a float clamped to [0, 1].
    """
    phash_component = (1 - phash_distance / 64) if phash_distance is not None else 0.0
    score = (
        0.50 * clip_score
        + 0.25 * phash_component
        + 0.15 * (1.0 if vision_api_hit else 0.0)
        + 0.10 * domain_trust
    )
    return round(min(max(score, 0.0), 1.0), 4)


def get_analytics() -> dict:
    """Aggregate asset and infringement counts directly from Supabase."""
    sb = get_supabase()
    assets_resp = sb.table("assets").select("id", count="exact").execute()
    inf_resp = sb.table("infringements").select("id,status,platform,confidence_score,detected_at").execute()
    infringements = inf_resp.data or []

    platform_breakdown: dict[str, int] = {}
    pending = valid = false_pos = dmca_sent = high_confidence = 0
    confidence_sum = 0.0
    last_scan_at: Optional[str] = None

    for inf in infringements:
        s = inf.get("status", "pending")
        p = inf.get("platform") or "unknown"
        cs: float = float(inf.get("confidence_score") or 0.0)
        detected = inf.get("detected_at")

        if s == "pending":
            pending += 1
        elif s == "valid":
            valid += 1
        elif s == "false_positive":
            false_pos += 1
        elif s == "dmca_sent":
            dmca_sent += 1

        if cs >= 0.90:
            high_confidence += 1

        confidence_sum += cs
        platform_breakdown[p] = platform_breakdown.get(p, 0) + 1

        if detected is not None:
            if last_scan_at is None or detected > last_scan_at:
                last_scan_at = detected

    total = len(infringements)
    avg_confidence = round(confidence_sum / total, 4) if total > 0 else 0.0

    return {
        "total_assets": assets_resp.count or 0,
        "total_infringements": total,
        "pending_count": pending,
        "valid_count": valid,
        "false_positive_count": false_pos,
        "dmca_sent_count": dmca_sent,
        "avg_confidence_score": avg_confidence,
        "high_confidence_count": high_confidence,
        "last_scan_at": last_scan_at,
        "platform_breakdown": platform_breakdown,
    }
