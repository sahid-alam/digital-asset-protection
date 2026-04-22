"""Supabase client singleton — imported by services, not by routers."""

from __future__ import annotations

from typing import Optional

from supabase import Client, create_client

from app.core.config import settings

_client: Optional[Client] = None


def get_supabase() -> Client:
    """Return the shared Supabase client, creating it on first call."""
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client
