"""Application configuration loaded from environment variables."""

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
    google_application_credentials: str = ""
    gcp_project_id: str = ""
    gemini_api_key: str = ""

    environment: str = "development"
    frontend_url: str = "http://localhost:5173"

    enable_real_crawler: bool = False
    enable_social_scan: bool = False


settings = Settings()
