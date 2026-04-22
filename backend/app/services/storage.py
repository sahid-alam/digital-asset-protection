"""Storage service — Supabase Storage upload and asset/fingerprint record management."""

from __future__ import annotations

import uuid
from typing import Optional

from app.core.supabase import get_supabase


async def upload_asset(file_bytes: bytes, filename: str, asset_type: str) -> str:
    """Upload to bucket 'assets' at path {asset_type}/{uuid}/{filename}. Returns public URL."""
    sb = get_supabase()
    path = f"{asset_type}/{uuid.uuid4()}/{filename}"
    sb.storage.from_("assets").upload(
        path,
        file_bytes,
        {"content-type": "application/octet-stream", "upsert": "true"},
    )
    return sb.storage.from_("assets").get_public_url(path)


def create_asset_record(
    owner_email: str,
    filename: str,
    asset_type: str,
    storage_url: str,
) -> dict:
    """Insert an asset row and return it."""
    resp = (
        get_supabase()
        .table("assets")
        .insert({
            "owner_email": owner_email,
            "filename": filename,
            "asset_type": asset_type,
            "storage_url": storage_url,
        })
        .execute()
    )
    return resp.data[0]


def get_asset_record(asset_id: str) -> Optional[dict]:
    """Fetch a single asset by ID."""
    resp = get_supabase().table("assets").select("*").eq("id", asset_id).execute()
    return resp.data[0] if resp.data else None


def list_asset_records(limit: int = 50) -> list[dict]:
    """Return assets ordered by created_at desc."""
    resp = (
        get_supabase()
        .table("assets")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return resp.data


def save_fingerprint_record(
    asset_id: str,
    clip_embedding: list[float],
    phash: Optional[str],
    vertex_embedding: Optional[list[float]],
    vision_api_labels: Optional[list[str]],
) -> dict:
    """Insert a fingerprint row and return it."""
    resp = (
        get_supabase()
        .table("fingerprints")
        .insert({
            "asset_id": asset_id,
            "clip_embedding": clip_embedding,
            "phash": phash,
            "vertex_embedding": vertex_embedding,
            "vision_api_labels": vision_api_labels,
        })
        .execute()
    )
    return resp.data[0]
