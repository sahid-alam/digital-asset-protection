"""Application configuration loaded from environment variables."""

from __future__ import annotations

import json
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    resend_api_key: str = ""
    email_from: str = "noreply@daps.com"

    google_api_key: str = ""
    google_search_engine_id: str = ""
    google_credentials_json: str = ""   # full service-account JSON string (Railway-compatible)
    gcp_project_id: str = ""
    gemini_api_key: str = ""

    environment: str = "development"
    frontend_url: str = "http://localhost:5173"

    enable_real_crawler: bool = False
    enable_social_scan: bool = False


settings = Settings()


def get_gcp_credentials() -> Optional[object]:
    """Load GCP service-account credentials from JSON string env var.

    Returns a Credentials object ready for Vision API and Vertex AI clients,
    or None if GOOGLE_CREDENTIALS_JSON is not set.
    """
    if not settings.google_credentials_json:
        return None
    from google.oauth2 import service_account  # type: ignore[import]
    creds_info = json.loads(settings.google_credentials_json)
    return service_account.Credentials.from_service_account_info(
        creds_info,
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
    )
