# Backend

FastAPI service for the Digital Asset Protection platform.

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp ../.env.example ../.env
# fill in all values in .env

uvicorn app.main:app --reload
```

Server runs at `http://localhost:8000`.

## Email notifications

Email is sent via [Resend](https://resend.com). The default `EMAIL_FROM` is `onboarding@resend.dev` (Resend's shared sandbox domain) — no domain setup required.

**Sandbox limitation:** When using `onboarding@resend.dev`, Resend only delivers to your own verified Resend account email. Set `owner_email` to that address when uploading assets during demo.

To send to any address, verify a domain at [resend.com/domains](https://resend.com/domains) and change `EMAIL_FROM` to `noreply@yourdomain.com`.
