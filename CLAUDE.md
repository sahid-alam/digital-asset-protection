# Digital Asset Protection System
**Build with AI 2026 · Hack2Skill · 5-6 day sprint**

AI-powered platform to detect, monitor, and enforce IP rights across digital platforms.
Fingerprints digital assets, crawls the web for matches, alerts owners, generates DMCA notices.

---

## Repo
https://github.com/sahid-alam/digital-asset-protection

## Key files
- `API_CONTRACT.md` — all endpoint signatures, locked. Do not change without lead approval.
- `backend/AGENT_PLAN.md` — detailed agent briefing for the backend build.
- `.env.example` — all required environment variables. Copy to `.env`, never commit `.env`.

---

## Tech stack

| Layer | Tech | Notes |
|-------|------|-------|
| Backend | FastAPI (Python), async | |
| Backend deploy | Cloud Run (GCP) | Containerized via Dockerfile. Port 8080. |
| Database | Supabase — PostgreSQL + pgvector | |
| Asset storage | Supabase Storage | Same client, zero extra setup |
| Image fingerprinting | CLIP ViT-B/32 + imagehash | Local model, loaded at startup |
| Image web detection | Google Vision API | Additive signal alongside CLIP |
| Document embeddings | Vertex AI text-embedding-004 | HTTP call, no local model |
| Similarity search | pgvector cosine similarity | Supabase built-in |
| Task queue | FastAPI BackgroundTasks | No Celery, no Redis |
| DMCA generation | Gemini 1.5 Flash | google-generativeai SDK. Jinja2 fallback. |
| Reverse image search | Google Custom Search API | 100 queries/day free |
| Email | Resend API | 100/day free |
| Frontend | React + Vite + TailwindCSS + shadcn/ui + Recharts | |
| Frontend deploy | Vercel | Zero config, connect repo and deploy |

### Google services (say these to judges)
Cloud Run · Vertex AI Embeddings · Gemini 1.5 Flash · Google Vision API · Google Custom Search API

### Submission compliance
- Cloud deployment: Cloud Run ✅
- At least one Google AI model/service: Gemini 1.5 Flash ✅

---

## Directory ownership
```
backend/          <- Lead + Claude Code agents
frontend/         <- M2 (human)
crawler/          <- M3 (human, data/QA only)
notifications/    <- M4 (human, docs/demo only)
```
Agents must never write to frontend/, crawler/, or notifications/.

---

## Architecture patterns

**1. Services layer (non-negotiable)**
Routers call services. Services call DB and AI. Nothing else.
  router -> service -> supabase / AI model / GCP API
Never write raw Supabase queries or GCP API calls inside a router.

**2. Thin routers**
Routers validate input, call one service function, return response. 10-15 lines max.

**3. Shared Pydantic models**
All data shapes defined once in backend/app/models/. Import everywhere, never redefine.

**4. Config via BaseSettings**
All env vars loaded through backend/app/core/config.py (Pydantic BaseSettings).
No os.getenv() calls scattered across files.

**5. Feature flags**
ENABLE_REAL_CRAWLER=false -> crawler returns mock data.
ENABLE_SOCIAL_SCAN=false -> social monitoring returns pre-seeded results.

**6. Models loaded at startup**
CLIP and imagehash loaded once in FastAPI lifespan event.
Vertex AI and Vision API are HTTP calls — no local model needed.

**7. Event-driven notifications**
Infringement written to DB -> BackgroundTasks.add_task(send_alert, infringement_id).
Never called directly from a router.

---

## GCP setup (Day 1 — do this first)
1. Create GCP project
2. Enable APIs: Cloud Run, Vertex AI, Cloud Vision, Gemini API
3. Create service account, download JSON key
4. Set GOOGLE_APPLICATION_CREDENTIALS to path of JSON key
5. Note: Vertex AI and Vision API have 5-10 min activation delays — enable before coding
No Firebase project needed.

---

## Guardrails
- No direct pushes to main — all changes via PR on own branch
- No hardcoded secrets — all through .env and config.py
- No os.getenv() outside config.py
- All functions must have full type hints
- New packages -> update requirements.txt in same commit
- Every new module -> one-line module docstring
- Frontend never touches Supabase directly — all data through the API
- Never commit service account JSON or any GCP credentials file

---

## Detection thresholds
- CLIP cosine similarity >= 0.90 -> infringement
- CLIP cosine similarity 0.75-0.90 -> review
- CLIP cosine similarity < 0.75 -> skip
- pHash Hamming distance < 10 -> near-duplicate
- Vision API web detection hit -> +0.15 to confidence score

## Confidence scoring formula
score = 0.50 * clip_score
      + 0.25 * (1 - phash_distance/64)   # 0 if no phash (doc)
      + 0.15 * (1.0 if vision_api_hit else 0.0)
      + 0.10 * domain_trust

---

## Demo flow (must never break)
1. Upload image -> fingerprint + Vision API check + Supabase Storage (<=3s)
2. POST /scan/{asset_id} -> similarity search vs 10k indexed assets
3. Infringement written -> dashboard updates with confidence score
4. Email notification fires
5. GET /infringements/{id}/dmca -> Gemini-generated PDF downloads

Feature freeze: end of Day 5. Day 6 = bug fixes + demo polish only.
Pre-seed 30 mock infringement records in prod DB before judging.