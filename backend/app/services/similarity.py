"""Similarity service — pgvector cosine search, pHash distance, scan jobs, and infringements."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from app.core.supabase import get_supabase
from app.models import SimilarityMatch
from app.services.scoring import compute_confidence_score

REVIEW_THRESHOLD = 0.75
INFRINGEMENT_THRESHOLD = 0.90


async def find_similar_assets(
    embedding: list[float],
    embedding_type: str,
    top_k: int = 20,
) -> list[SimilarityMatch]:
    """Cosine similarity via pgvector RPC; returns matches >= 0.75.

    embedding_type "clip" queries clip_embedding (vector 512).
    embedding_type "vertex" queries vertex_embedding (vector 768).
    """
    resp = (
        get_supabase()
        .rpc("match_fingerprints", {
            "query_embedding": embedding,
            "match_threshold": REVIEW_THRESHOLD,
            "match_count": top_k,
        })
        .execute()
    )
    rows = resp.data or []
    results: list[SimilarityMatch] = []
    for row in rows:
        clip_score: float = float(row.get("score", 0.0))
        confidence = compute_confidence_score(clip_score, None, False)
        results.append(SimilarityMatch(
            source_url="",
            platform="",
            clip_score=clip_score,
            phash_distance=None,
            vision_api_hit=False,
            confidence_score=confidence,
        ))
    return results


def compute_phash_distance(phash_a: str, phash_b: str) -> int:
    """Hamming distance between two pHash hex strings. < 10 = near-duplicate."""
    import imagehash
    return int(imagehash.hex_to_hash(phash_a) - imagehash.hex_to_hash(phash_b))


# ---------------------------------------------------------------------------
# Scan job helpers
# ---------------------------------------------------------------------------

def create_scan_job_record(asset_id: str) -> dict:
    """Insert a scan_job row with status='queued' and return it."""
    resp = (
        get_supabase()
        .table("scan_jobs")
        .insert({"asset_id": asset_id, "status": "queued", "matches_found": 0})
        .execute()
    )
    return resp.data[0]


def get_scan_job_record(job_id: str) -> Optional[dict]:
    """Fetch a scan_job by ID."""
    resp = get_supabase().table("scan_jobs").select("*").eq("id", job_id).execute()
    return resp.data[0] if resp.data else None


def update_scan_job_record(job_id: str, status: str, matches_found: int = 0) -> dict:
    """Update scan_job status and match count."""
    resp = (
        get_supabase()
        .table("scan_jobs")
        .update({
            "status": status,
            "matches_found": matches_found,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", job_id)
        .execute()
    )
    return resp.data[0]


def get_fingerprint_for_asset(asset_id: str) -> Optional[dict]:
    """Fetch the fingerprint row for an asset."""
    resp = (
        get_supabase()
        .table("fingerprints")
        .select("*")
        .eq("asset_id", asset_id)
        .execute()
    )
    return resp.data[0] if resp.data else None


# ---------------------------------------------------------------------------
# Infringement helpers
# ---------------------------------------------------------------------------

def create_infringement_record(
    asset_id: str,
    source_url: str,
    platform: str,
    confidence_score: float,
    clip_score: float,
    phash_distance: Optional[int],
    vision_api_hit: bool,
) -> dict:
    """Insert an infringement row and return it."""
    resp = (
        get_supabase()
        .table("infringements")
        .insert({
            "asset_id": asset_id,
            "source_url": source_url,
            "platform": platform,
            "confidence_score": confidence_score,
            "clip_score": clip_score,
            "phash_distance": phash_distance,
            "vision_api_hit": vision_api_hit,
            "status": "pending",
        })
        .execute()
    )
    return resp.data[0]


def get_infringement_record(infringement_id: str) -> Optional[dict]:
    """Fetch a single infringement by ID."""
    resp = (
        get_supabase()
        .table("infringements")
        .select("*")
        .eq("id", infringement_id)
        .execute()
    )
    return resp.data[0] if resp.data else None


def list_infringement_records(
    asset_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
) -> list[dict]:
    """List infringements with optional filters, ordered by detected_at desc."""
    q = get_supabase().table("infringements").select("*")
    if asset_id:
        q = q.eq("asset_id", asset_id)
    if status:
        q = q.eq("status", status)
    return q.order("detected_at", desc=True).limit(limit).execute().data


def update_infringement_record(infringement_id: str, status: str) -> dict:
    """Update infringement status and return the updated row."""
    resp = (
        get_supabase()
        .table("infringements")
        .update({"status": status})
        .eq("id", infringement_id)
        .execute()
    )
    return resp.data[0]
