"""Scan router — trigger similarity scans and poll job status."""

from __future__ import annotations

import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.models import ScanJobResponse
from app.services.crawler import crawl_for_matches
from app.services.notification import send_infringement_alert
from app.services.scoring import compute_confidence_score
from app.services.similarity import (
    create_infringement_record,
    create_scan_job_record,
    get_fingerprint_for_asset,
    get_scan_job_record,
    update_scan_job_record,
)
from app.services.storage import get_asset_record

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/{asset_id}", response_model=ScanJobResponse)
async def start_scan(asset_id: str, background_tasks: BackgroundTasks) -> ScanJobResponse:
    """Queue a similarity scan for an asset."""
    if not get_asset_record(asset_id):
        raise HTTPException(status_code=404, detail="Asset not found")
    job = create_scan_job_record(asset_id)
    background_tasks.add_task(run_scan, asset_id, job["id"])
    return ScanJobResponse(job_id=job["id"], asset_id=asset_id, status="queued", matches_found=0)


@router.get("/status/{job_id}", response_model=ScanJobResponse)
def get_scan_status(job_id: str) -> ScanJobResponse:
    """Poll scan job status."""
    job = get_scan_job_record(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return ScanJobResponse(
        job_id=job["id"], asset_id=job["asset_id"],
        status=job["status"], matches_found=job["matches_found"],
    )


async def run_scan(asset_id: str, job_id: str) -> None:
    """Background task: crawl, score, write infringement records, fire alerts."""
    try:
        update_scan_job_record(job_id, "running")
        fp_data = get_fingerprint_for_asset(asset_id)
        asset = get_asset_record(asset_id)
        if not fp_data or not asset:
            update_scan_job_record(job_id, "failed")
            return

        vision_labels = fp_data.get("vision_api_labels") or []
        candidates = await crawl_for_matches(asset_id, asset["storage_url"], vision_labels)
        matches_count = 0

        for candidate in candidates:
            clip_score: float = candidate["clip_score"]
            phash_distance = candidate.get("phash_distance")
            vision_hit: bool = candidate.get("vision_api_hit", False)
            confidence = compute_confidence_score(clip_score, phash_distance, vision_hit)
            inf = create_infringement_record(
                asset_id, candidate["source_url"], candidate["platform"],
                confidence, clip_score, phash_distance, vision_hit,
            )
            await send_infringement_alert(inf["id"])
            matches_count += 1

        update_scan_job_record(job_id, "completed", matches_count)
    except Exception:
        logger.exception("Scan failed for asset %s job %s", asset_id, job_id)
        update_scan_job_record(job_id, "failed")
