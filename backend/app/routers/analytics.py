"""Analytics router — platform breakdown, status counts, trends."""

from __future__ import annotations

from fastapi import APIRouter

from app.models import AnalyticsSummary
from app.services.scoring import get_analytics

router = APIRouter()


@router.get("/summary", response_model=AnalyticsSummary)
def summary() -> AnalyticsSummary:
    """Return aggregate counts for the dashboard."""
    return AnalyticsSummary(**get_analytics())
