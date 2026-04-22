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
    inf_resp = sb.table("infringements").select("id,status,platform").execute()
    infringements = inf_resp.data or []

    platform_breakdown: dict[str, int] = {}
    pending = valid = false_pos = 0
    for inf in infringements:
        s = inf.get("status", "pending")
        p = inf.get("platform") or "unknown"
        if s == "pending":
            pending += 1
        elif s == "valid":
            valid += 1
        elif s == "false_positive":
            false_pos += 1
        platform_breakdown[p] = platform_breakdown.get(p, 0) + 1

    return {
        "total_assets": assets_resp.count or 0,
        "total_infringements": len(infringements),
        "pending_count": pending,
        "valid_count": valid,
        "false_positive_count": false_pos,
        "platform_breakdown": platform_breakdown,
    }
