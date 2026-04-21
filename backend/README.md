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
