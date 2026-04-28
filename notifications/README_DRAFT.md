# SENTRY — Digital Asset Protection System

## Overview

SENTRY is an AI-powered system to detect unauthorized usage of digital assets and automate takedown actions.

## Key Features

- Upload assets
- AI fingerprinting (CLIP + pHash + Vision API)
- Web detection using Google CSE
- Confidence scoring
- Email alerts (Resend)
- DMCA generation (Gemini)

## Workflow

Upload → Fingerprint → Store → Scan → Match → Score → Alert → DMCA

## Tech Stack

Frontend: React + Vite  
Backend: FastAPI  
Database: Supabase + pgvector

## AI Used

- CLIP ViT-B/32
- Google Vision API
- Gemini 1.5 Flash
- Vertex AI embeddings

## Deployment

- Vercel (frontend)
- Railway (backend)

## Impact

Automates copyright protection and reduces manual monitoring.
