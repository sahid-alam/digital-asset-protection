"""DMCA service — Gemini 1.5 Flash notice generation with Jinja2 fallback."""

from __future__ import annotations

import logging

from app.core.config import settings
from app.core.supabase import get_supabase

logger = logging.getLogger(__name__)


async def generate_dmca_notice(infringement_id: str) -> bytes:
    """Generate DMCA PDF via Gemini 1.5 Flash; falls back to Jinja2 template."""
    sb = get_supabase()

    inf_resp = sb.table("infringements").select("*").eq("id", infringement_id).execute()
    if not inf_resp.data:
        raise ValueError(f"Infringement {infringement_id} not found")
    infringement = inf_resp.data[0]

    asset_resp = sb.table("assets").select("*").eq("id", infringement["asset_id"]).execute()
    if not asset_resp.data:
        raise ValueError(f"Asset for infringement {infringement_id} not found")
    asset = asset_resp.data[0]

    try:
        return await _generate_with_gemini(infringement, asset)
    except Exception as exc:
        logger.warning("Gemini DMCA generation failed, using Jinja2 fallback: %s", exc)
        return _generate_with_jinja2(infringement, asset)


async def _generate_with_gemini(infringement: dict, asset: dict) -> bytes:
    from google import genai  # type: ignore[import]

    client = genai.Client(api_key=settings.gemini_api_key)
    prompt = (
        f"Generate a formal DMCA takedown notice for the following infringement:\n"
        f"Asset: {asset['filename']}\n"
        f"Owner Email: {asset.get('owner_email', 'Unknown')}\n"
        f"Infringing URL: {infringement['source_url']}\n"
        f"Platform: {infringement.get('platform', 'Unknown')}\n"
        f"Confidence Score: {infringement['confidence_score']}\n"
        f"Detection Date: {infringement.get('detected_at', '')}\n\n"
        f"Format as a professional legal notice with: To Whom It May Concern, "
        f"description of original work, infringement details, legal basis (DMCA 17 USC 512), "
        f"contact info, and signature block."
    )
    response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
    return _text_to_pdf(response.text)


def _generate_with_jinja2(infringement: dict, asset: dict) -> bytes:
    from jinja2 import Environment  # type: ignore[import]

    env = Environment()
    template_str = (
        "DMCA TAKEDOWN NOTICE\n\n"
        "Date: {{ detected_at }}\n"
        "To Whom It May Concern,\n\n"
        "I am writing to notify you of copyright infringement of my work "
        '"{{ filename }}".\n'
        "The infringing content is located at: {{ source_url }}\n"
        "Platform: {{ platform }}\n\n"
        "I request immediate removal under 17 U.S.C. § 512.\n\n"
        "Signed,\n{{ owner_email }}"
    )
    text = env.from_string(template_str).render(
        filename=asset["filename"],
        source_url=infringement["source_url"],
        platform=infringement.get("platform", "unknown"),
        detected_at=str(infringement.get("detected_at", "")),
        owner_email=asset.get("owner_email", "Unknown"),
    )
    return _text_to_pdf(text)


def _text_to_pdf(text: str) -> bytes:
    import io
    from fpdf import FPDF  # type: ignore[import]

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()
    pdf.set_font("Helvetica", size=11)
    width = pdf.w - pdf.l_margin - pdf.r_margin
    for line in text.split("\n"):
        pdf.multi_cell(width, 6, line if line.strip() else " ")
    buf = io.BytesIO()
    pdf.output(buf)
    return buf.getvalue()
