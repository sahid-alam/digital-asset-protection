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
Assets stored in Supabase Storage. Backend deploys to Cloud Run.

Demo flow that must work end-to-end:
1. POST /assets/upload -> fingerprint + Vision API + Supabase Storage (<=3s)
2. POST /scan/{asset_id} -> similarity search against 10k indexed assets
3. Infringement written to DB -> dashboard updates
4. Email notification fires automatically
5. GET /infringements/{id}/dmca -> Gemini-generated PDF returned

---

## Agent roles

### Agent 1 — Orchestrator
- Reads this plan, assigns tasks to Agents 2 and 3 via shared task list
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
    clip_embedding: list[float]             # 512-dim, images only
    phash: Optional[str]                    # 64-bit hex, images only
    vertex_embedding: Optional[list[float]] # 768-dim, documents only
    vision_api_labels: Optional[list[str]]  # from Vision API, images only

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
    status: str  # valid | false_positive | dmca_sent

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
# CLIP + imagehash loaded ONCE at startup via FastAPI lifespan
# Vertex AI and Vision API are HTTP calls — no local model needed

async def generate_image_fingerprint(
    file_bytes: bytes,
    asset_id: uuid.UUID
) -> FingerprintResult:
    """
    1. CLIP ViT-B/32 -> 512-dim embedding
    2. imagehash pHash -> 64-bit hex string
    3. Google Vision API annotate (WEB_DETECTION) -> list of web labels
    Returns FingerprintResult with clip_embedding, phash, vision_api_labels.
    """

async def generate_document_fingerprint(
    file_bytes: bytes,
    filename: str,
    asset_id: uuid.UUID
) -> FingerprintResult:
    """
    Extract text from document, call Vertex AI text-embedding-004.
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
    """
    pgvector cosine similarity query against fingerprints table.
    Thresholds: >= 0.90 = infringement, 0.75-0.90 = review, < 0.75 = skip.
    Returns only matches above 0.75.
    """

async def compute_phash_distance(phash_a: str, phash_b: str) -> int:
    """Hamming distance between two pHash strings. < 10 = near-duplicate."""
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
    score = 0.50 * clip_score
          + 0.25 * (1 - phash_distance/64)  # 0 if phash_distance is None
          + 0.15 * (1.0 if vision_api_hit else 0.0)
          + 0.10 * domain_trust
    Returns float 0-1.
    """
```

### Agent 2: backend/app/services/crawler.py

```python
async def crawl_for_matches(
    asset_id: uuid.UUID,
    storage_url: str
) -> list[dict]:
    """
    If ENABLE_REAL_CRAWLER=true:
      Call Google Custom Search Image API with storage_url
      Return list of {source_url, platform} dicts
    If ENABLE_REAL_CRAWLER=false:
      Return mock list of 5 realistic URLs across Twitter, Reddit, DeviantArt
    """
```

### Agent 3: backend/app/services/storage.py

```python
async def upload_asset(
    file_bytes: bytes,
    filename: str,
    asset_type: str
) -> str:
    """
    Upload file_bytes to Supabase Storage bucket 'assets'.
    Path: {asset_type}/{uuid}/{filename}
    Return public URL string.
    Uses SUPABASE_SERVICE_ROLE_KEY for admin upload.
    """
```

### Agent 3: backend/app/services/dmca.py

```python
async def generate_dmca_notice(infringement_id: uuid.UUID) -> bytes:
    """
    Fetch infringement + asset from Supabase.
    If Gemini API available:
      Use gemini-1.5-flash via google-generativeai SDK to fill Jinja2 template
      with asset name, source URL, detection date, confidence score.
    Else:
      Fall back to hardcoded Jinja2 template.
    Convert to PDF via WeasyPrint. Return PDF bytes.
    """
```

### Agent 3: backend/app/services/notification.py

```python
async def send_infringement_alert(infringement_id: uuid.UUID) -> None:
    """
    Fetch infringement + asset details from Supabase.
    Send email via Resend API to asset owner_email.
    Include: asset name, source URL, confidence score, dashboard link.
    Silently fails if owner_email is None — never raise in background task.
    """
```

---

## Router contracts (Agent 3 — thin, 10-15 lines max)

### backend/app/routers/assets.py

```
POST /assets/upload
  Accept: multipart/form-data (file + optional owner_email)
  Detect asset_type from MIME type (image/* -> image, else -> document)
  Call storage.upload_asset() -> storage_url
  Call fingerprint service
  Store asset + fingerprint in Supabase
  Return: AssetUploadResponse

GET /assets -> list[AssetUploadResponse]
GET /assets/{id} -> AssetUploadResponse
```

### backend/app/routers/scan.py

```
POST /scan/{asset_id}
  Create scan_job record status="queued"
  Add BackgroundTask: run_scan(asset_id, job_id)
  Return: ScanJobResponse immediately (do not wait)

GET /scan/status/{job_id} -> ScanJobResponse
```

Background task run_scan(asset_id, job_id):
  1. Update job status -> "running"
  2. Fetch fingerprint from DB
  3. Call crawl_for_matches() -> candidate URLs
  4. For each URL: fetch image, fingerprint it, call find_similar_assets()
  5. For matches above threshold: call compute_confidence_score()
  6. Write infringement records to DB
  7. For each infringement: add nested BackgroundTask(send_infringement_alert)
  8. Update job status -> "completed", matches_found = count

### backend/app/routers/infringements.py

```
GET /infringements
  Optional query params: asset_id, status, limit=50
  Return: list[InfringementRecord]

GET /infringements/{id} -> InfringementRecord

PATCH /infringements/{id}
  Body: InfringementStatusUpdate
  Return: InfringementRecord

GET /infringements/{id}/dmca
  Call generate_dmca_notice(id)
  Return: Response(pdf_bytes, media_type="application/pdf")
  Header: Content-Disposition: attachment; filename="dmca_{id}.pdf"
```

### backend/app/routers/analytics.py

```
GET /analytics/summary -> AnalyticsSummary
```

---

## Config (Agent 3: backend/app/core/config.py)

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    # Email
    resend_api_key: str
    email_from: str = "noreply@daps.com"
    # Google APIs
    google_api_key: str = ""
    google_search_engine_id: str = ""
    google_application_credentials: str = ""  # path to service account JSON
    gcp_project_id: str = ""
    gemini_api_key: str = ""
    # App
    environment: str = "development"
    frontend_url: str = "http://localhost:5173"
    enable_real_crawler: bool = False
    enable_social_scan: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## main.py (Agent 1 owns this)

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.fingerprint import load_models
    load_models()  # loads CLIP + imagehash at startup
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

## Dockerfile (Agent 3)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium --with-deps
COPY . .
EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

Cloud Run uses port 8080. Set PORT=8080 in Cloud Run env config.

---

## Guardrails (all agents enforce)
- Never write to frontend/, crawler/, notifications/
- Never push to main — all work on dev/backend branch
- Never hardcode secrets — everything through config.py
- Every function must have full type hints
- Every new module must have a one-line docstring
- New packages -> update requirements.txt in same commit
- Routers never call DB or GCP APIs directly — always through a service
- CLIP never loaded inside a request handler — startup only
- Never commit service account JSON

---

## Acceptance criteria

### Agent 2 done when:
- [ ] generate_image_fingerprint() returns 512-dim CLIP + pHash + Vision API labels
- [ ] generate_document_fingerprint() returns 768-dim Vertex AI embedding
- [ ] find_similar_assets() queries pgvector with correct threshold logic
- [ ] compute_confidence_score() uses the 4-component weighted formula
- [ ] crawl_for_matches() returns mock data when ENABLE_REAL_CRAWLER=false
- [ ] Vision API called per image, result stored in fingerprints.vision_api_labels
- [ ] CLIP loaded at startup, not per-request

### Agent 3 done when:
- [ ] All 4 Supabase tables created with pgvector indexes
- [ ] All Pydantic models in models/__init__.py with correct types
- [ ] All routers thin, calling services only, no direct DB calls
- [ ] upload_asset() uploads to Supabase Storage, returns public URL
- [ ] generate_dmca_notice() returns valid PDF, Gemini + fallback both work
- [ ] send_infringement_alert() emails via Resend, silent fail if no email
- [ ] config.py loads all env vars cleanly
- [ ] Dockerfile builds and starts on port 8080

### Agent 1 (Orchestrator) done when:
- [ ] main.py wires all routers, CORS configured, lifespan loads CLIP
- [ ] GET /health returns 200
- [ ] Full demo flow works E2E: upload -> scan -> infringement -> email -> DMCA PDF
- [ ] App runs clean with no import errors
- [ ] All code reviewed and challenges addressed