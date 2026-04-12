# Life OS

AI-powered personal life management platform. 10 life domains. Real AI coaching.

## Quick Start

```bash
# 1. Clone and configure
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Edit both .env files with your API keys

# 2. Run DB migration
# Go to Supabase > SQL Editor > paste contents of:
# backend/app/db/migrations/001_initial_schema.sql

# 3. Start everything
docker-compose up

# API:      http://localhost:8080
# Frontend: http://localhost:3000
# Docs:     http://localhost:8080/docs (dev mode)
# Flower:   http://localhost:5555
```

## Required API Keys

| Key | Get from |
|-----|----------|
| `SUPABASE_URL` + keys | supabase.com → Project Settings |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `GOOGLE_AI_API_KEY` | aistudio.google.com |
| `MEM0_API_KEY` | app.mem0.ai (optional) |

## Architecture

- **Frontend:** Next.js 15 (App Router, TypeScript, Tailwind v4)
- **Backend:** FastAPI (Python 3.12, async)
- **Database:** Supabase (PostgreSQL + pgvector + RLS)
- **AI:** Claude Sonnet (coaching) + Gemini Flash (analysis)
- **Memory:** Mem0 + pgvector
- **Cache:** Redis
- **Workers:** Celery (daily brief, weekly review)
- **Infra:** GCP Cloud Run

## Sprint Plan

- **Sprint 1 (Week 1-2):** Foundation ✅
- **Sprint 2 (Week 3-4):** Domain modules
- **Sprint 3 (Week 5-6):** AI coaching + reviews
- **Sprint 4 (Week 7-8):** Polish + launch
