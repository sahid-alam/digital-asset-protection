# Test Images for Demo

For best detection results, test with images that already exist across the web.

## Images that work well

- Any widely shared meme or viral image
- Famous stock photos (the "distracted boyfriend", "woman laughing at salad", etc.)
- Your own images that you've previously posted on social media

## How detection works

The system uses **Google Vision API WEB_DETECTION** to find where your image appears on the internet. When a match is found, the real page URL is used as the infringement source.

Personal photos that have never been shared online will show **simulated results** — the system falls back to realistic mock infringement records so the dashboard is never empty.

## Quick test

Download any well-known stock photo (e.g. from Unsplash) and upload it via:

```bash
curl -X POST http://localhost:8000/assets/upload \
  -F "file=@your_image.jpg" \
  -F "owner_email=you@example.com"
```

Then trigger a scan:

```bash
curl -X POST http://localhost:8000/scan/{asset_id}
```

If Vision API returns real page URLs, `vision_api_hit: true` will appear on those infringement records.
