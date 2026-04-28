"""Shared Pydantic models for the Digital Asset Protection API."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AssetUploadResponse(BaseModel):
    id: str
    filename: str
    asset_type: str
    storage_url: str
    fingerprint_id: str
    message: str


class FingerprintResult(BaseModel):
    asset_id: str
    clip_embedding: list[float]
    phash: Optional[str] = None
    vertex_embedding: Optional[list[float]] = None
    vision_api_labels: Optional[list[str]] = None


class SimilarityMatch(BaseModel):
    source_url: str
    platform: str
    clip_score: float
    phash_distance: Optional[int] = None
    vision_api_hit: bool
    confidence_score: float


class InfringementRecord(BaseModel):
    id: str
    asset_id: str
    source_url: str
    platform: str
    confidence_score: float
    clip_score: float
    phash_distance: Optional[int] = None
    vision_api_hit: bool
    status: str
    detected_at: datetime


class InfringementStatusUpdate(BaseModel):
    status: str


class ScanJobResponse(BaseModel):
    job_id: str
    asset_id: str
    status: str
    matches_found: int


class AnalyticsSummary(BaseModel):
    total_assets: int
    total_infringements: int
    pending_count: int
    valid_count: int
    false_positive_count: int
    dmca_sent_count: int
    avg_confidence_score: float
    high_confidence_count: int
    last_scan_at: Optional[datetime] = None
    platform_breakdown: dict[str, int]
