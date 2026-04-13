# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (FastAPI — run from `backend/`)
```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080   # dev server

pytest tests/unit tests/regression -q --tb=short   # all tests
pytest tests/unit/test_score_service.py -k test_compute_domain_score_no_data  # single test
```

### Frontend (Next.js — run from `frontend/`)
```bash
npm ci
npm run dev      # dev server on :3000
npm run build    # production build (runs type-check)
npm run lint
```

### Full stack local
```bash
docker-compose up   # from repo root — frontend :3000, API :8080
```

---

## Architecture

### Monorepo layout
```
/backend    FastAPI Python 3.12 API (GCP Cloud Run)
/frontend   Next.js 15 App Router (GCP Cloud Run)
/scripts    DB migration + seed scripts
```

### Request flow
```
Browser → Next.js frontend (port 3000 / Cloud Run)
       → Axios api client (lib/api.ts) with Supabase JWT
       → FastAPI backend (/api/v1/*)
       → Supabase PostgreSQL (RLS enforced)
       → Claude / Gemini AI (optional, per-request)
```

### Backend structure
- **`app/main.py`** — FastAPI app, CORS, security headers, router registration, inline `/api/v1/profile` and `/api/v1/scores/all` aliases
- **`app/api/v1/`** — route modules: `users`, `entries`, `goals`, `habits`, `domains`, `social`, `notifications`, `ai_coach`
- **`app/services/`** — `score_service` (domain/life score computation), `ai_service` (model routing + Claude/Gemini/Ollama calls), `review_service` (daily brief + weekly review)
- **`app/memory/`** — `compressor.py` (Karpathy-style context compression, keeps AI prompts under 2200 tokens), `mem0_client.py` (long-term memory, fails open if unavailable)
- **`app/security/`** — `auth.py` (Supabase JWT verification), `rate_limiter.py` (Redis-backed sliding window, fails open if Redis unavailable)
- **`app/models/`** — Pydantic v2 models
- **`app/config.py`** — `Settings` via pydantic-settings, reads `.env`

### Frontend structure
- **`app/(dashboard)/`** — all authenticated pages. Each domain (health, family, etc.) renders `<DomainPage domainId="...">` from `components/life-os/DomainPage.tsx`
- **`lib/api.ts`** — all API calls; Supabase JWT auto-attached via axios interceptor
- **`lib/utils.ts`** — `DOMAINS` array (source of truth for the 10 domain IDs, labels, colors); `getDomain()`, `formatScore()`
- **`components/life-os/`** — shared UI: `DomainPage`, `AICoachChat`, `LifeScore`, `WheelOfLife`, `DomainChart`, `EntryForm`, `GoalProgress`

### AI model routing (`app/services/ai_service.py`)
| Intent | Model |
|--------|-------|
| `life_coaching` | `claude-sonnet-4-6` |
| `daily_brief` | `claude-haiku-4-5-20251001` |
| `weekly_review` | `claude-sonnet-4-6` |
| `data_analysis`, `document_review` | `gemini-1.5-pro` |
| `quick_response`, `insights` | `gemini-1.5-flash` |
| `health_sensitive` | `ollama/llama3.2` (local only) |

---

## Hard rules (React 19 + Next.js 15)

**1. Never SSR framer-motion or Recharts.**
React 19 upgraded hydration mismatches from warnings to hard crashes. Any component using `motion.*` or `ResponsiveContainer` must be loaded with `dynamic(() => import(...), { ssr: false })`. This applies even inside `"use client"` components if the parent can be server-rendered.

**2. All Supabase queryFns must guard against null.**
Supabase Python returns `null` (not `[]`) for empty tables. `useQuery`'s `= []` default only fires for `undefined`. Pattern:
```ts
queryFn: () => api.get("/foo").then(r => Array.isArray(r.data) ? r.data : [])
```
Backend: `result.data or []` on every list query.

**3. No `new Date()` in SSR render.**
Cloud Run server is UTC; user browser is local timezone. Compute in `useEffect`, use `suppressHydrationWarning` on the element.

**4. Redis is optional everywhere.**
Cloud Run has no Redis. `rate_limiter.py` and `score_service.py` both fail-open (allow request through / skip cache) on any Redis error.

---

## Testing

- **Unit tests** (`tests/unit/`) — mock Supabase and Redis via `monkeypatch`; patch targets must be module-level attributes (e.g. `app.services.score_service.get_redis`, not a lazy import inside a function)
- **Regression tests** (`tests/regression/`) — `TestClient` with patched DB; must pass before every deploy
- CI runs `pytest tests/unit tests/regression` (not integration tests — those require live Supabase)
- `conftest.py` provides `mock_supabase`, `mock_redis`, `mock_ai`, `test_user` fixtures

## Environment variables

Backend needs: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`  
Frontend needs: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`  
Optional: `MEM0_API_KEY`, `REDIS_URL` (both fail-open if absent)
