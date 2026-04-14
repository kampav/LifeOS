# Changelog

All notable changes to Life OS are documented here.
Format: `[version] YYYY-MM-DD — Persona — Description`

---

## [0.4.0] 2026-04-14 — PRD 1.0 Complete

### Added
- **Pipeline fix:** Removed `JWT_SECRET` from Cloud Run `--set-secrets` (secret doesn't exist in GCP; Supabase handles JWT internally — was breaking every prod deploy)
- **Notifications:** `GET/POST /notifications/preferences` — user notification preference storage in profile JSONB
- **Celery:** Evening reflection task at 9 PM daily (PRD §3.3) — creates in-app notification for all active users
- **Audit log:** `002_audit_log.sql` migration — immutable write audit table with RLS, delete/update rules, indexes (PRD §6.4 Critical Non-Negotiable)
- **Audit middleware:** `app/security/audit.py` — fire-and-forget async write audit for all POST/PUT/DELETE operations
- **PWA icons:** `icon-192.png` + `icon-512.png` generated — manifest.json references were broken (install would fail on mobile)
- **E2E tests:** `frontend/e2e/critical-paths.spec.ts` — 10 Playwright critical path tests (login, auth redirect, health entry, goal, habit, AI chat, daily brief, notifications, domain score, settings)
- **Playwright config:** `playwright.config.ts` — chromium + mobile Safari, staging URL via env var, non-blocking in CI until E2E secrets configured

---

## [0.3.2] 2026-04-13 — Sprint 3 Complete

### Added (Full-Stack)
- **Backend:** `PUT /api/v1/notifications/read-all` — marks all unread in a single DB call; route ordered before `/{id}/read` to avoid path capture
- **Backend:** `pip-audit` added to `requirements.txt`; CI security scan fixed (`pip audit` → `pip-audit --desc`)
- **Backend:** CI deploy secrets hardened — `SUPABASE_ANON_KEY` added to staging, `JWT_SECRET` added to both staging and production `--set-secrets`
- **Frontend:** AI Coach page rebuilt — desktop `w-72` sidebar + mobile slide-in drawer with conversation history, domain badges, `formatDistanceToNow` timestamps
- **Frontend:** `AICoachChat` — `conversationId` + `onConversationCreated` props; loads existing conversations on mount; `key` prop forces remount on switch
- **Frontend:** `Header.tsx` mark-all-read replaced N parallel calls with single `PUT /notifications/read-all`
- **Frontend:** `aiApi.getConversation(id)` added to `lib/api.ts`
- **Tests:** `test_ai_coach.py` — 12 tests: chat, conversations, rate limiting, daily brief, weekly review, memory endpoints
- **Tests:** `test_notifications.py` — 7 tests: list, mark-read, mark-all-read (incl. null guard), delete, unauthenticated rejection

### Fixed
- `ai_service.py` — `google-genai` import moved inside `call_gemini()` to fix `ImportError` in environments without the package
- `score_service.py` — `get_redis` promoted to module-level import (was lazy inside helpers), fixing CI `AttributeError`

---

## [0.3.1] 2026-04-12 — Backend Hardening

### Fixed (Backend Engineer + SRE)
- **Critical:** CORS misconfiguration — production Cloud Run frontend URL not in `ALLOWED_ORIGINS`, blocking every API call. Added `https://life-os-frontend-574662870196.europe-west2.run.app` to default `config.py`
- **Critical:** Supabase null safety — `compressor.py`, `habits.py` streak calc, `social.py` due-checkins, and `workers/tasks.py` all iterated `result.data` without `or []` guard, crashing on empty tables
- **Fixed:** Model IDs — updated `ai_service.py` and `review_service.py` from deprecated `claude-sonnet-4-5` to `claude-sonnet-4-6`

---

## [0.3.0] 2026-04-12 — Stability Release

### Fixed (SRE + Frontend)
- **Critical:** `TypeError: y.filter is not a function` — NotificationBell called `.filter()` on `null` (Supabase returns `null` for empty tables, not `[]`). Fix: `Array.isArray` guard in queryFn + backend `or []` fallback
- **Critical:** React 19 hydration crash on dashboard — `new Date().getHours()` and `toLocaleDateString()` differ between UTC Cloud Run server and user's local timezone. Fix: greeting computed in `useEffect`, `suppressHydrationWarning` on date element
- **Critical:** framer-motion `motion.*` components cause hard crashes in React 19 when SSR-rendered. Rule established: all framer-motion and Recharts components must use `dynamic(ssr:false)`
- **Critical:** `require()` in LazyChat component body — invalid in React render. Replaced with `next/dynamic`
- **Critical:** `WheelOfLife` (Recharts `ResponsiveContainer`) SSR hydration mismatch. Made `ssr:false`
- **Fixed:** `more/page.tsx` — `motion.div` wrapping all 10 domain items → plain `div`
- **Fixed:** `settings/page.tsx` — `motion.div` tab wrapper → plain `div`
- **Fixed:** `coach/page.tsx` — static `AICoachChat` import → `dynamic(ssr:false)`
- **Fixed:** `DomainPage` — `LifeScore`, `AICoachChat`, chart all made `ssr:false`; null guards on goals; safe date parsing
- **Fixed:** `goals/page.tsx`, `habits/page.tsx` — null guards on API responses
- **Added:** `global-error.tsx` — displays actual error name, message, stack for debugging
- **Added:** `DomainChart.tsx` — extracted Recharts chart as dedicated dynamic component

### Infrastructure (DevOps)
- Frontend + Backend live on GCP Cloud Run (europe-west2)
- Secret Manager integrated for all sensitive env vars
- CI/CD pipeline via GitHub Actions fully operational

---

## [0.2.0] 2026-04-10 — Foundation + Deploy

### Added (Architect + Frontend + Backend + DevOps)
- Full monorepo scaffold: Next.js 15 + FastAPI + Supabase
- Auth: Supabase email/password + Google OAuth flow
- Dashboard: Life Score ring, Wheel of Life radar chart, 10 domain cards, Quick Capture FAB
- 10 domain pages with entry forms, trend charts, goal progress
- AI Coach chat (Claude Sonnet via `/ai/chat`)
- Daily brief + weekly review AI generation
- Goals CRUD with progress tracking
- Habits tracking with streak counter
- Review page, Settings (profile, priorities, notifications, plan)
- Notifications bell + panel
- Sidebar + BottomNav responsive layout
- PostCSS config for Tailwind v4
- Login + Register pages (redesigned: split-screen, Google OAuth button)
- Error boundary wrapping dashboard content
- GCP Cloud Run deployment (frontend + backend)
- GitHub Actions CI/CD with Secret Manager

### Fixed (Backend)
- `ModuleNotFoundError: No module named 'app'` — added `pythonpath = ["."]` to `pyproject.toml`
- `google.generativeai` deprecated — migrated to `google-genai` SDK
- `test_unauthenticated` accepting both 401 and 403

---

## [0.1.0] 2026-04-07 — Scaffold

### Added (Architect)
- PRD v1.0 finalised (10 domains, 4 sprint plan, freemium model)
- DB schema: 15 tables, RLS policies, pgvector extension
- Monorepo structure: `/frontend`, `/backend`, `/scripts`
- Docker Compose for local development
- Initial GitHub Actions workflow skeleton
