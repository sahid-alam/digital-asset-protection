-- Digital Asset Protection — Supabase schema
-- Run this in the Supabase SQL editor before starting the backend.

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- assets
-- ============================================================
CREATE TABLE IF NOT EXISTS assets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email TEXT NOT NULL,
  filename    TEXT NOT NULL,
  asset_type  TEXT NOT NULL CHECK (asset_type IN ('image', 'document')),
  description TEXT,
  storage_url TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- fingerprints
-- ============================================================
CREATE TABLE IF NOT EXISTS fingerprints (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id          UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  clip_embedding    vector(512),
  phash             TEXT,
  vertex_embedding  vector(768),
  vision_api_labels TEXT[],
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for fast cosine similarity on CLIP embeddings
CREATE INDEX IF NOT EXISTS fingerprints_clip_hnsw
  ON fingerprints USING hnsw (clip_embedding vector_cosine_ops);

-- ============================================================
-- scan_jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS scan_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id      UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  matches_found INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- infringements
-- ============================================================
CREATE TABLE IF NOT EXISTS infringements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id         UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  source_url       TEXT NOT NULL,
  platform         TEXT NOT NULL,
  confidence_score FLOAT NOT NULL,
  clip_score       FLOAT NOT NULL,
  phash_distance   INT,
  vision_api_hit   BOOL NOT NULL DEFAULT FALSE,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'valid', 'false_positive', 'dmca_sent')),
  detected_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS infringements_asset_id_idx ON infringements(asset_id);
CREATE INDEX IF NOT EXISTS infringements_status_idx ON infringements(status);

-- ============================================================
-- pgvector similarity search RPC
-- ============================================================
CREATE OR REPLACE FUNCTION match_fingerprints(
  query_embedding vector(512),
  match_threshold float,
  match_count     int
)
RETURNS TABLE (asset_id uuid, score float, phash text)
LANGUAGE sql STABLE
AS $$
  SELECT f.asset_id,
         1 - (f.clip_embedding <=> query_embedding) AS score,
         f.phash
  FROM fingerprints f
  WHERE 1 - (f.clip_embedding <=> query_embedding) >= match_threshold
  ORDER BY score DESC
  LIMIT match_count;
$$;
