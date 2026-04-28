"""Infringements router — list, detail, status update, and DMCA generation."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from app.models import InfringementRecord, InfringementStatusUpdate
from app.services.dmca import generate_dmca_notice
from app.services.similarity import (
    get_infringement_record,
    list_infringement_records,
    update_infringement_record,
)

router = APIRouter()


def _to_record(row: dict) -> InfringementRecord:
    return InfringementRecord(
        id=row["id"],
        asset_id=row["asset_id"],
        source_url=row["source_url"],
        platform=row.get("platform") or "unknown",
        confidence_score=row["confidence_score"],
        clip_score=row.get("clip_score") or 0.0,
        phash_distance=row.get("phash_distance"),
        vision_api_hit=bool(row.get("vision_api_hit", False)),
        status=row["status"],
        detected_at=row["detected_at"],
    )


@router.get("/", response_model=list[InfringementRecord])
def list_infringements(
    asset_id: Optional[str] = None,
    status: Optional[str] = None,
    platform: Optional[str] = Query(None),
    min_confidence: Optional[float] = Query(None),
    limit: int = 50,
) -> list[InfringementRecord]:
    """List infringement records with optional filters."""
    if asset_id:
        asset_id = asset_id.strip()
    return [
        _to_record(r)
        for r in list_infringement_records(asset_id, status, limit, platform, min_confidence)
    ]


@router.get("/{infringement_id}", response_model=InfringementRecord)
def get_infringement(infringement_id: str) -> InfringementRecord:
    """Get a single infringement record."""
    row = get_infringement_record(infringement_id)
    if not row:
        raise HTTPException(status_code=404, detail="Infringement not found")
    return _to_record(row)


@router.patch("/{infringement_id}", response_model=InfringementRecord)
def update_infringement(infringement_id: str, body: InfringementStatusUpdate) -> InfringementRecord:
    """Update infringement status."""
    if not get_infringement_record(infringement_id):
        raise HTTPException(status_code=404, detail="Infringement not found")
    return _to_record(update_infringement_record(infringement_id, body.status))


@router.get("/{infringement_id}/dmca")
async def get_dmca(infringement_id: str) -> Response:
    """Generate and stream DMCA takedown notice as PDF."""
    if not get_infringement_record(infringement_id):
        raise HTTPException(status_code=404, detail="Infringement not found")
    pdf_bytes = await generate_dmca_notice(infringement_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="dmca_{infringement_id}.pdf"'},
    )
