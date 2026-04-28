"""Fingerprint service — CLIP embedding, pHash, and Vertex AI text embeddings."""

from __future__ import annotations

import gc
import io
from typing import Optional

import httpx
import imagehash
import open_clip
import torch
from PIL import Image

from app.core.config import get_gcp_credentials, settings
from app.models import FingerprintResult

_model: Optional[object] = None
_preprocess: Optional[object] = None


def load_models() -> None:
    """Load CLIP ViT-B/32 into module globals. Called once at startup."""
    global _model, _preprocess
    if _model is not None:
        return
    print("Loading CLIP model... this takes ~30s on first boot", flush=True)
    model, _, preprocess = open_clip.create_model_and_transforms(
        "ViT-B-32", pretrained="openai"
    )
    model.eval()
    # Keep only the visual encoder — text encoder (~250MB) is never used here.
    # This frees enough RAM to stay within Railway's 512MB limit.
    _model = model.visual
    del model.transformer, model.token_embedding, model.positional_embedding
    del model.ln_final, model.text_projection, model
    gc.collect()
    _preprocess = preprocess
    print("CLIP model loaded.", flush=True)


async def generate_image_fingerprint(file_bytes: bytes, asset_id: str) -> FingerprintResult:
    """CLIP embedding + pHash + Vision API labels for an image asset."""
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    # Cap at 1024px longest side — CLIP downsamples to 224x224 anyway, no quality loss.
    img.thumbnail((1024, 1024), Image.LANCZOS)

    tensor = _preprocess(img).unsqueeze(0)  # type: ignore[operator]
    with torch.no_grad():
        features = _model(tensor)  # type: ignore[operator] — _model is the visual encoder
        features = features / features.norm(dim=-1, keepdim=True)
    clip_embedding: list[float] = features[0].tolist()
    phash = str(imagehash.dhash(img))

    vision_result = _call_vision_api(file_bytes)
    labels = vision_result["labels"]
    web_urls = vision_result["web_urls"]
    # Store labels + web page URLs together; URLs prefixed "url::" for crawler to consume
    all_labels = labels + [f"url::{u}" for u in web_urls]

    return FingerprintResult(
        asset_id=asset_id,
        clip_embedding=clip_embedding,
        phash=phash,
        vertex_embedding=None,
        vision_api_labels=all_labels if all_labels else None,
    )


async def generate_document_fingerprint(
    file_bytes: bytes, filename: str, asset_id: str  # noqa: ARG001
) -> FingerprintResult:
    """Vertex AI text-embedding-004 for a document asset."""
    try:
        text = file_bytes.decode("utf-8", errors="ignore")
    except Exception:
        text = ""
    vertex_embedding = await _get_vertex_embedding(text) if text.strip() else [0.0] * 768
    return FingerprintResult(
        asset_id=asset_id,
        clip_embedding=[0.0] * 512,
        phash=None,
        vertex_embedding=vertex_embedding,
        vision_api_labels=None,
    )


def _call_vision_api(image_bytes: bytes) -> dict:
    """Call Vision API WEB_DETECTION. Returns {"labels": [...], "web_urls": [...]}."""
    try:
        from google.cloud import vision  # type: ignore[import]
        import logging
        creds = get_gcp_credentials()
        client = vision.ImageAnnotatorClient(credentials=creds) if creds else vision.ImageAnnotatorClient()
        image = vision.Image(content=image_bytes)
        response = client.web_detection(image=image)
        labels = [
            entity.description
            for entity in response.web_detection.web_entities
            if entity.score > 0.5
        ]
        web_urls = [
            page.url
            for page in response.web_detection.pages_with_matching_images
            if page.url
        ]
        return {"labels": labels, "web_urls": web_urls}
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("Vision API unavailable: %s", exc)
        return {"labels": [], "web_urls": []}


async def _get_vertex_embedding(text: str) -> list[float]:
    """Call Vertex AI text-embedding-004 via HTTP, using credentials from GOOGLE_CREDENTIALS_JSON."""
    try:
        creds = get_gcp_credentials()
        if creds is None:
            return [0.0] * 768

        # Refresh the credentials to get a valid access token
        from google.auth.transport.requests import Request  # type: ignore[import]
        creds.refresh(Request())  # type: ignore[union-attr]

        url = (
            f"https://us-central1-aiplatform.googleapis.com/v1/projects/"
            f"{settings.gcp_project_id}/locations/us-central1/publishers/google/"
            f"models/text-embedding-004:predict"
        )
        headers = {
            "Authorization": f"Bearer {creds.token}",  # type: ignore[union-attr]
            "Content-Type": "application/json",
        }
        body = {"instances": [{"content": text[:3000]}]}
        async with httpx.AsyncClient() as client:
            r = await client.post(url, headers=headers, json=body, timeout=30)
            r.raise_for_status()
            return r.json()["predictions"][0]["embeddings"]["values"]
    except Exception:
        return [0.0] * 768
