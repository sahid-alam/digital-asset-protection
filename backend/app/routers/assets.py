"""Assets router — upload, list, and retrieve registered assets."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Form, HTTPException, UploadFile

from app.models import AssetUploadResponse
from app.services import fingerprint as fp_svc
from app.services.storage import (
    create_asset_record,
    get_asset_record,
    list_asset_records,
    save_fingerprint_record,
    upload_asset,
)

router = APIRouter()


@router.post("/upload", response_model=AssetUploadResponse)
async def upload(
    file: UploadFile,
    owner_email: Optional[str] = Form(None),
) -> AssetUploadResponse:
    """Upload and fingerprint a digital asset."""
    file_bytes = await file.read()
    filename = file.filename or "file"
    asset_type = "image" if (file.content_type or "").startswith("image/") else "document"

    storage_url = await upload_asset(file_bytes, filename, asset_type)
    asset = create_asset_record(owner_email or "", filename, asset_type, storage_url)

    if asset_type == "image":
        fp = await fp_svc.generate_image_fingerprint(file_bytes, asset["id"])
    else:
        fp = await fp_svc.generate_document_fingerprint(file_bytes, filename, asset["id"])

    fp_rec = save_fingerprint_record(
        asset["id"], fp.clip_embedding, fp.phash, fp.vertex_embedding, fp.vision_api_labels
    )

    return AssetUploadResponse(
        id=asset["id"],
        filename=asset["filename"],
        asset_type=asset["asset_type"],
        storage_url=storage_url,
        fingerprint_id=fp_rec["id"],
        message="Asset uploaded and fingerprinted",
    )


@router.get("/", response_model=list[AssetUploadResponse])
def list_assets() -> list[AssetUploadResponse]:
    """List all registered assets."""
    return [
        AssetUploadResponse(
            id=r["id"], filename=r["filename"], asset_type=r["asset_type"],
            storage_url=r["storage_url"], fingerprint_id="", message="",
        )
        for r in list_asset_records()
    ]


@router.get("/{asset_id}", response_model=AssetUploadResponse)
def get_asset(asset_id: str) -> AssetUploadResponse:
    """Get a single asset by ID."""
    row = get_asset_record(asset_id)
    if not row:
        raise HTTPException(status_code=404, detail="Asset not found")
    return AssetUploadResponse(
        id=row["id"], filename=row["filename"], asset_type=row["asset_type"],
        storage_url=row["storage_url"], fingerprint_id="", message="",
    )
