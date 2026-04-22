"""Supabase client singleton and typed DB helpers."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from supabase import Client, create_client

from app.core.config import settings

_client: Optional[Client] = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client


# ---------------------------------------------------------------------------
# Assets
# ---------------------------------------------------------------------------


def create_asset(
    owner_email: str,
    filename: str,
    asset_type: str,
    description: Optional[str],
    storage_url: str,
) -> dict:
    resp = (
        get_supabase()
        .table("assets")
        .insert(
            {
                "owner_email": owner_email,
                "filename": filename,
                "asset_type": asset_type,
                "description": description,
                "storage_url": storage_url,
            }
        )
        .execute()
    )
    return resp.data[0]


def get_asset(asset_id: str) -> Optional[dict]:
    resp = (
        get_supabase()
        .table("assets")
        .select("*")
        .eq("id", asset_id)
        .execute()
    )
    return resp.data[0] if resp.data else None


def list_assets(limit: int = 50, offset: int = 0) -> list[dict]:
    resp = (
        get_supabase()
        .table("assets")
        .select("*")
        .range(offset, offset + limit - 1)
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data


def update_asset_storage_url(asset_id: str, storage_url: str) -> dict:
    resp = (
        get_supabase()
        .table("assets")
        .update({"storage_url": storage_url})
        .eq("id", asset_id)
        .execute()
    )
    return resp.data[0]


# ---------------------------------------------------------------------------
# Fingerprints
# ---------------------------------------------------------------------------


def create_fingerprint(
    asset_id: str,
    clip_embedding: list[float],
    phash: Optional[str],
    vertex_embedding: Optional[list[float]],
    vision_api_labels: Optional[list[str]],
) -> dict:
    resp = (
        get_supabase()
        .table("fingerprints")
        .insert(
            {
                "asset_id": asset_id,
                "clip_embedding": clip_embedding,
                "phash": phash,
                "vertex_embedding": vertex_embedding,
                "vision_api_labels": vision_api_labels,
            }
        )
        .execute()
    )
    return resp.data[0]


def get_fingerprint_by_asset(asset_id: str) -> Optional[dict]:
    resp = (
        get_supabase()
        .table("fingerprints")
        .select("*")
        .eq("asset_id", asset_id)
        .execute()
    )
    return resp.data[0] if resp.data else None


def find_similar_by_clip(
    embedding: list[float],
    threshold: float = 0.75,
    limit: int = 20,
) -> list[dict]:
    """Call the match_fingerprints Supabase RPC function.

    Returns list of dicts with keys: asset_id, score, phash.
    """
    resp = (
        get_supabase()
        .rpc(
            "match_fingerprints",
            {
                "query_embedding": embedding,
                "match_threshold": threshold,
                "match_count": limit,
            },
        )
        .execute()
    )
    return resp.data or []


# ---------------------------------------------------------------------------
# Scan jobs
# ---------------------------------------------------------------------------


def create_scan_job(asset_id: str) -> dict:
    resp = (
        get_supabase()
        .table("scan_jobs")
        .insert({"asset_id": asset_id, "status": "queued", "matches_found": 0})
        .execute()
    )
    return resp.data[0]


def get_scan_job(job_id: str) -> Optional[dict]:
    resp = (
        get_supabase()
        .table("scan_jobs")
        .select("*")
        .eq("id", job_id)
        .execute()
    )
    return resp.data[0] if resp.data else None


def update_scan_job(job_id: str, status: str, matches_found: int = 0) -> dict:
    resp = (
        get_supabase()
        .table("scan_jobs")
        .update(
            {
                "status": status,
                "matches_found": matches_found,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", job_id)
        .execute()
    )
    return resp.data[0]


# ---------------------------------------------------------------------------
# Infringements
# ---------------------------------------------------------------------------


def create_infringement(
    asset_id: str,
    source_url: str,
    platform: str,
    confidence_score: float,
    clip_score: float,
    phash_distance: Optional[int],
    vision_api_hit: bool,
) -> dict:
    resp = (
        get_supabase()
        .table("infringements")
        .insert(
            {
                "asset_id": asset_id,
                "source_url": source_url,
                "platform": platform,
                "confidence_score": confidence_score,
                "clip_score": clip_score,
                "phash_distance": phash_distance,
                "vision_api_hit": vision_api_hit,
                "status": "pending",
            }
        )
        .execute()
    )
    return resp.data[0]


def get_infringement(infringement_id: str) -> Optional[dict]:
    resp = (
        get_supabase()
        .table("infringements")
        .select("*")
        .eq("id", infringement_id)
        .execute()
    )
    return resp.data[0] if resp.data else None


def list_infringements(
    asset_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
) -> list[dict]:
    query = get_supabase().table("infringements").select("*")
    if asset_id:
        query = query.eq("asset_id", asset_id)
    if status:
        query = query.eq("status", status)
    resp = query.limit(limit).order("detected_at", desc=True).execute()
    return resp.data


def update_infringement_status(infringement_id: str, status: str) -> dict:
    resp = (
        get_supabase()
        .table("infringements")
        .update({"status": status})
        .eq("id", infringement_id)
        .execute()
    )
    return resp.data[0]


def get_asset_owner_email(asset_id: str) -> Optional[str]:
    asset = get_asset(asset_id)
    return asset["owner_email"] if asset else None


def get_analytics_summary() -> dict:
    """Query infringements and assets tables for summary counts."""
    sb = get_supabase()
    assets_resp = sb.table("assets").select("id", count="exact").execute()
    inf_resp = sb.table("infringements").select("id,status,platform").execute()
    infringements = inf_resp.data or []
    platform_breakdown: dict[str, int] = {}
    pending = valid = false_pos = 0
    for inf in infringements:
        status = inf.get("status", "pending")
        platform = inf.get("platform") or "unknown"
        if status == "pending":
            pending += 1
        elif status == "valid":
            valid += 1
        elif status == "false_positive":
            false_pos += 1
        platform_breakdown[platform] = platform_breakdown.get(platform, 0) + 1
    return {
        "total_assets": assets_resp.count or 0,
        "total_infringements": len(infringements),
        "pending_count": pending,
        "valid_count": valid,
        "false_positive_count": false_pos,
        "platform_breakdown": platform_breakdown,
    }
