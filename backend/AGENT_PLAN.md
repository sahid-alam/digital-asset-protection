# DAPS Backend — Agent Build Plan
**Project:** Digital Asset Protection System
**Repo:** https://github.com/sahid-alam/digital-asset-protection
**Agents:** 3
**Read first:** CLAUDE.md in repo root — all architecture patterns and guardrails apply.

---

## What we're building

Full FastAPI backend for DAPS. Fingerprints uploaded digital assets using CLIP + Google Vision API,
stores embeddings in Supabase pgvector, runs similarity searches to detect infringement, fires
email alerts via Resend, and generates DMCA notice PDFs via Gemini 1.5 Flash.
Assets stored in Supabase Storage. Backend deploys to Railway.

Demo flow that must work end-to-end:
1. POST /assets/upload -> fingerprint + Vision API + Supabase Storage (<=3s)
2. POST /scan/{asset_id} -> similarity search against 10k indexed assets
3. Infringement written to DB -> dashboard updates
4. Email notification fires automatically
5. GET /infringements/{id}/dmca -> Gemini-generated PDF returned

---

## Agent roles

### Agent 1 — Orchestrator
- Reads this plan, assigns tasks to Agents 2 and 3
- Reviews all code before it is considered done
- Owns backend/app/main.py — wires all routers together
- Runs the full app after each integration point and fixes whatever breaks
- Challenges other agents: "Does this router call a service? Does this function have type hints?"
- Never writes to frontend/, crawler/, notifications/

### Agent 2 — AI Engine
Owns: backend/app/services/fingerprint.py, similarity.py, scoring.py, crawler.py

### Agent 3 — API & Database
Owns: backend/app/routers/ (all files), backend/app/models/, backend/app/core/config.py,
      backend/app/services/dmca.py, backend/app/services/notification.py,
      backend/app/services/storage.py, Dockerfile

---

## CRITICAL: GCP Credentials — Railway approach

Railway has no filesystem. Do NOT use file path for GOOGLE_APPLICATION_CREDENTIALS.
Instead the entire service account JSON is stored as a single env var: GOOGLE_CREDENTIALS_JSON

Load credentials in core/config.py or wherever GCP clients are initialized:

```python
import json, os
from google.oauth2 import service_account

def get_gcp_credentials():
    creds_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
    if not creds_json:
        return None
    creds_info = json.loads(creds_json)
    return service_account.Credentials.from_service_account_info(
        creds_info,
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
```

Pass these credentials when initializing Vision API and Vertex AI clients.

---

## Supabase schema (Agent 3 creates these)

```sql
create extension if not exists vector;

create table assets (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  asset_type text not null check (asset_type in ('image', 'document')),
  storage_url text not null,
  owner_email text,
  created_at timestamptz default now()
);

create table fingerprints (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references assets(id) on delete cascade,
  clip_embedding vector(512),
  phash text,
  vertex_embedding vector(768),
  vision_api_labels jsonb,
  created_at timestamptz default now()
);
create index on fingerprints using ivfflat (clip_embedding vector_cosine_ops);
create index on fingerprints using ivfflat (vertex_embedding vector_cosine_ops);

create table infringements (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references assets(id) on delete cascade,
  source_url text not null,
  platform text,
  confidence_score float not null,
  clip_score float,
  phash_distance int,
  vision_api_hit boolean default false,
  status text default 'pending' check (status in ('pending','valid','false_positive','dmca_sent')),
  detected_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table scan_jobs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references assets(id) on delete cascade,
  status text default 'queued' check (status in ('queued','running','completed','failed')),
  matches_found int default 0,
  created_at timestamptz default now(),
  completed_at timestamptz
);
```

---

## Pydantic models (Agent 3 owns backend/app/models/__init__.py)

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

class AssetUploadResponse(BaseModel):
    id: uuid.UUID
    filename: str
    asset_type: str
    storage_url: str
    fingerprint_id: uuid.UUID
    message: str

class FingerprintResult(BaseModel):
    asset_id: uuid.UUID
    clip_embedding: list[float]
    phash: Optional[str]
    vertex_embedding: Optional[list[float]]
    vision_api_labels: Optional[list[str]]

class SimilarityMatch(BaseModel):
    source_url: str
    platform: Optional[str]
    clip_score: float
    phash_distance: Optional[int]
    vision_api_hit: bool
    confidence_score: float

class InfringementRecord(BaseModel):
    id: uuid.UUID
    asset_id: uuid.UUID
    source_url: str
    platform: Optional[str]
    confidence_score: float
    clip_score: Optional[float]
    phash_distance: Optional[int]
    vision_api_hit: bool
    status: str
    detected_at: datetime

class InfringementStatusUpdate(BaseModel):
    status: str

class ScanJobResponse(BaseModel):
    job_id: uuid.UUID
    asset_id: uuid.UUID
    status: str
    matches_found: int

class AnalyticsSummary(BaseModel):
    total_assets: int
    total_infringements: int
    pending_count: int
    valid_count: int
    false_positive_count: int
    platform_breakdown: dict[str, int]
```

---

## Service function signatures

### Agent 2: backend/app/services/fingerprint.py

```python
# CLIP + imagehash loaded ONCE at startup. Vision API + Vertex AI are HTTP calls.

def load_models() -> None:
    """Load CLIP and imagehash at startup. Store as module-level globals."""

async def generate_image_fingerprint(
    file_bytes: bytes,
    asset_id: uuid.UUID
) -> FingerprintResult:
    """
    1. CLIP ViT-B/32 -> 512-dim embedding
    2. imagehash pHash -> 64-bit hex string
    3. Google Vision API WEB_DETECTION -> list of web labels
    Use get_gcp_credentials() from config for Vision API client.
    """

async def generate_document_fingerprint(
    file_bytes: bytes,
    filename: str,
    asset_id: uuid.UUID
) -> FingerprintResult:
    """
    Extract text, call Vertex AI text-embedding-004.
    Use get_gcp_credentials() for Vertex AI client.
    Returns FingerprintResult with vertex_embedding populated.
    """
```

### Agent 2: backend/app/services/similarity.py

```python
async def find_similar_assets(
    embedding: list[float],
    embedding_type: str,   # "clip" | "vertex"
    top_k: int = 20
) -> list[SimilarityMatch]:
    """pgvector cosine similarity. >= 0.90 infringement, 0.75-0.90 review, <0.75 skip."""

async def compute_phash_distance(phash_a: str, phash_b: str) -> int:
    """Hamming distance. < 10 = near-duplicate."""
```

### Agent 2: backend/app/services/scoring.py

```python
def compute_confidence_score(
    clip_score: float,
    phash_distance: Optional[int],
    vision_api_hit: bool,
    domain_trust: float = 0.5
) -> float:
    """
    score = 0.50*clip_score + 0.25*(1-phash/64) + 0.15*vision_hit + 0.10*domain_trust
    phash component = 0 if phash_distance is None.
    """
```

### Agent 2: backend/app/services/crawler.py

```python
async def crawl_for_matches(asset_id: uuid.UUID, storage_url: str) -> list[dict]:
    """
    ENABLE_REAL_CRAWLER=true -> Google Custom Search Image API
    ENABLE_REAL_CRAWLER=false -> 5 mock URLs (Twitter, Reddit, DeviantArt, Instagram, Pinterest)
    """
```

### Agent 3: backend/app/services/storage.py

```python
async def upload_asset(file_bytes: bytes, filename: str, asset_type: str) -> str:
    """
    Upload to Supabase Storage bucket 'assets'.
    Path: {asset_type}/{uuid}/{filename}
    Return public URL.
    """
```

### Agent 3: backend/app/services/dmca.py

```python
async def generate_dmca_notice(infringement_id: uuid.UUID) -> bytes:
    """
    Gemini 1.5 Flash (google-generativeai SDK) fills Jinja2 template.
    Fallback: hardcoded Jinja2 template if Gemini unavailable.
    Convert to PDF via WeasyPrint. Return bytes.
    """
```

### Agent 3: backend/app/services/notification.py

```python
async def send_infringement_alert(infringement_id: uuid.UUID) -> None:
    """
    Resend API email to owner_email.
    Silent fail if no email or Resend fails. Never raise.
    """
```

---

## Config (Agent 3: backend/app/core/config.py)

```python
from pydantic_settings import BaseSettings
import json, os
from google.oauth2 import service_account

class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    resend_api_key: str
    email_from: str = "noreply@daps.com"
    google_api_key: str = ""
    google_search_engine_id: str = ""
    google_credentials_json: str = ""   # full JSON string of service account
    gcp_project_id: str = ""
    gemini_api_key: str = ""
    environment: str = "development"
    frontend_url: str = "http://localhost:5173"
    enable_real_crawler: bool = False
    enable_social_scan: bool = False

    class Config:
        env_file = ".env"

settings = Settings()

def get_gcp_credentials():
    """Load GCP service account from JSON string env var (Railway-compatible)."""
    if not settings.google_credentials_json:
        return None
    creds_info = json.loads(settings.google_credentials_json)
    return service_account.Credentials.from_service_account_info(
        creds_info,
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
```

---

## Dockerfile (Agent 3) — Railway uses $PORT

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium --with-deps
COPY . .
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

Railway sets PORT dynamically. Never hardcode 8080 or any fixed port.

---

## main.py (Agent 1)

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.fingerprint import load_models
    load_models()
    yield

app = FastAPI(title="DAPS API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import assets, scan, infringements, analytics
app.include_router(assets.router, prefix="/assets", tags=["assets"])
app.include_router(scan.router, prefix="/scan", tags=["scan"])
app.include_router(infringements.router, prefix="/infringements", tags=["infringements"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])

@app.get("/health")
def health():
    return {"status": "ok", "env": settings.environment}
```

---

## Guardrails
- Never write to frontend/, crawler/, notifications/
- Never push to main — work on dev/backend
- Never hardcode secrets — config.py only
- Every function must have full type hints
- Every module must have a one-line docstring
- New packages -> update requirements.txt same commit
- Routers never call DB or GCP directly — always through services
- Never use GOOGLE_APPLICATION_CREDENTIALS file path — use GOOGLE_CREDENTIALS_JSON string

---

## Acceptance criteria

### Agent 2 done when:
- [ ] load_models() loads CLIP at startup, not per-request
- [ ] generate_image_fingerprint() returns 512-dim embedding + pHash + Vision API labels
- [ ] generate_document_fingerprint() returns 768-dim Vertex AI embedding
- [ ] find_similar_assets() queries pgvector with correct thresholds
- [ ] compute_confidence_score() uses 4-component formula
- [ ] crawl_for_matches() returns mock when ENABLE_REAL_CRAWLER=false
- [ ] All GCP clients use get_gcp_credentials() from config

### Agent 3 done when:
- [ ] All 4 Supabase tables created with pgvector indexes
- [ ] All Pydantic models in models/__init__.py correct
- [ ] All routers thin, services-only, no direct DB calls
- [ ] upload_asset() uploads to Supabase Storage, returns URL
- [ ] generate_dmca_notice() returns PDF bytes, Gemini + fallback work
- [ ] send_infringement_alert() emails via Resend, silent fail if no email
- [ ] config.py has GOOGLE_CREDENTIALS_JSON (not file path)
- [ ] Dockerfile CMD uses ${PORT:-8000} not hardcoded port

### Agent 1 done when:
- [ ] main.py wires all routers, CORS configured, lifespan loads CLIP
- [ ] GET /health returns 200
- [ ] Full demo flow works E2E: upload -> scan -> infringement -> email -> DMCA PDF
- [ ] App runs clean with no import errors