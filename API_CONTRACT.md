# API Contract

> **Locked.** Do not change endpoint signatures without lead approval.

Base URL (local): `http://localhost:8080`

---

## Assets

### `POST /assets/upload`
Upload an asset, generate its fingerprint, and store it in Supabase Storage.

**Request:** `multipart/form-data`
| Field | Type | Required |
|-------|------|----------|
| file | binary | yes |
| owner_email | string | yes |
| description | string | no |

**Response `200`:** `AssetUploadResponse`
```json
{
  "id": "uuid",
  "filename": "logo.png",
  "asset_type": "image",
  "storage_url": "https://...",
  "fingerprint_id": "uuid",
  "message": "Asset uploaded and fingerprinted."
}
```

---

### `GET /assets`
List all registered assets.

**Query params:** `limit` (default 50), `offset` (default 0)

**Response `200`:** array of asset objects

---

### `GET /assets/{id}`
Asset details including fingerprint metadata.

**Response `200`:** asset object with nested fingerprint

---

## Scan

### `POST /scan/{asset_id}`
Trigger a similarity scan. Returns immediately; scan runs in background.

**Response `202`:** `ScanJobResponse`
```json
{
  "job_id": "uuid",
  "asset_id": "uuid",
  "status": "queued",
  "matches_found": 0
}
```

---

### `GET /scan/status/{job_id}`
Poll scan job status.

**Response `200`:**
```json
{
  "job_id": "uuid",
  "asset_id": "uuid",
  "status": "running | completed | failed",
  "matches_found": 7
}
```

---

## Infringements

### `GET /infringements`
List infringements.

**Query params:** `asset_id`, `status` (`pending | valid | false_positive | dmca_sent`), `limit` (default 50)

**Response `200`:** array of `InfringementRecord`

---

### `GET /infringements/{id}`
Full infringement detail.

**Response `200`:** `InfringementRecord`

---

### `PATCH /infringements/{id}`
Update infringement status.

**Request body:** `InfringementStatusUpdate`
```json
{ "status": "valid | false_positive | dmca_sent" }
```

**Response `200`:** updated `InfringementRecord`

---

### `GET /infringements/{id}/dmca`
Generate and return a DMCA notice PDF. Uses Gemini 1.5 Flash; falls back to Jinja2 template.

**Response `200`:** `application/pdf`

---

## Analytics

### `GET /analytics/summary`
Platform breakdown, counts by status, trends.

**Response `200`:** `AnalyticsSummary`
```json
{
  "total_assets": 42,
  "total_infringements": 130,
  "pending_count": 10,
  "valid_count": 95,
  "false_positive_count": 20,
  "platform_breakdown": {
    "instagram": 45,
    "twitter": 30,
    "unknown": 55
  }
}
```

---

## Health

### `GET /health`
Server status check.

**Response `200`:**
```json
{ "status": "ok", "env": "development" }
```
