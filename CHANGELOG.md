# Changelog

All notable changes to Life OS are documented here.
Format: `[version] YYYY-MM-DD — Persona — Description`

---

## [0.5.0] 2026-04-14 — Sprint 5: Multi-Agent + MCP + Personalisation

### Added (Backend)
- **Multi-agent architecture:** `backend/app/agents/` — supervisor + 7 domain agents (health→Ollama Tier 3, all others→Haiku) + 2 task agents (review, inbox)
- **Supervisor:** `supervisor.py` — routes messages to domain agents, supports parallel cross-domain calls, max 3 tool calls per turn
- **Domain agents:** `domain_agents/` — health, finance, family, social, growth, career, property. Health + sensitive finance hardwired to `health_sensitive` intent (Ollama)
- **Context system:** `agents/context.py` — `detect_domain()` (zero tokens, keyword scoring), `build_system_prompt()` (≤500 tokens), `build_personalisation_block()` (≤80 tokens), `EXPERTISE_BLOCKS` for 7 domains
- **MCP server:** `app/mcp/lifeos_server.py` — 5 tools exposed to Claude Desktop: `get_life_summary`, `create_task`, `get_upcoming_dates`, `log_entry`, `ask_coach`. Auth via `LIFE_OS_API_TOKEN`
- **MCP client:** `app/mcp/mcp_client.py` — `build_mcp_servers()` attaches Google Workspace + Mem0 servers based on user integrations
- **MCP sidecars:** `health_mcp.py`, `finance_mcp.py` — internal context fetchers, never exposed externally
- **Personalisation API:** `GET/PATCH /users/me/personalisation`, `POST /reset`, `GET /learning`, `POST /undo` — 7 fields: tone, detail, domain weights, alert cadence, accent colour, layout density, font size
- **MCP tokens API:** `GET/POST/DELETE /mcp/tokens`, `GET /mcp/tools`, `GET /mcp/server-config`
- **Disclaimers:** `app/security/disclaimers.py` — `FINANCIAL_DISCLAIMER`, `HEALTH_DISCLAIMER`, `AI_TRANSPARENCY` with `inject_disclaimer()`
- **CoachResponse models:** `MetricTile`, `CoachSection`, `QuickAction`, `CoachResponse` Pydantic models in `models/conversation.py`
- **Token budgets:** `TOKEN_BUDGETS` dict in `config.py` (all PRD §13 values)
- **Celery:** `run_weekly_personalisation_calibration` — Monday 3 AM UTC, nudges domain weights toward observed engagement
- **DB migrations:** `007_mcp_tokens.sql`, `008_personalisation.sql` (with auto-create trigger + RLS)
- **Tests:** `test_supervisor.py` (5 tests), `test_personalisation.py` (4 tests) — 39/39 passing

### Changed (Backend)
- **`POST /ai/chat`** now routes through supervisor; response `message` is JSON-serialised `CoachResponse` (backwards-compatible — frontend parses if JSON, falls back to plain text)
- **`compute_life_score()`** accepts optional `weights: dict[str,int]` from `user_personalisation` — falls back to declared_priorities if not provided
- **`fastapi` upgraded** to ≥0.135.0 for starlette 1.0 compatibility (required by `mcp>=1.0.0`)

### Added (Frontend)
- **`CoachResponse.tsx`** — renders structured sections (insight/data/list/question/warning/success), metric tiles, quick action buttons, created-items banner. Falls back to plain text
- **`AICoachChat.tsx`** — detects JSON CoachResponse and renders `<CoachResponse>`; adds paperclip button (wired up in Sprint 7); `data-role="assistant"` on message bubbles for E2E
- **`/settings/preferences`** page — tone picker, detail selector, domain weight sliders, alert cadence, accent colour swatches (12 + custom), layout density, font size
- **`PersonalisationInit.tsx`** — fetches prefs on session mount and calls `applyPersonalisation()` (CSS variable injection)
- **`lib/personalisation.ts`** — `applyPersonalisation()`, `savePreference()` (debounced 1s), `hexToRgba()`
- **`lib/api.ts`** — `personalisationApi`, `mcpApi`, `notificationsApi` added

---

## [0.7.0] 2026-04-14 — Sprint 7: Document Upload + Google Workspace MCP

### Added (Backend)
- **Documents API:** `POST /coach/upload` (up to 5 files, 50 MB each), `GET /coach/upload/{id}/status`, `POST /coach/upload/{id}/confirm` (single logical transaction), `POST /coach/upload/{id}/skip`, `GET /coach/uploads`
- **Document service:** `app/services/document_service.py` — `extract_content()` (PyMuPDF for PDF, python-docx for DOCX, Gemini vision for images), `classify_sensitivity()` (zero-token regex: tier 3 = health, tier 2 = finance, tier 1 = general), `process_document()` (routes to `health_sensitive` intent for tier 3, `document_review` for tier 1/2), `confirm_extraction()` (persists confirmed items as tasks/goals/entries, marks upload confirmed)
- **Integrations:** `009_integrations.sql` — `integrations`, `sync_logs`, `inbox_items` tables with RLS
- **DB migration:** `006_document_uploads.sql` — `document_uploads` table with 24h expiry index and RLS
- **MCP client update:** `build_mcp_servers()` now attaches Google Workspace MCP (Calendar + Gmail read) and Gmail triage sidecar when `google` integration active; `get_user_integrations()` queries `provider` / `status` columns (matches new schema)
- **Celery tasks:** `schedule_gcs_deletion` (sets custom-time on GCS blob for 24h lifecycle deletion), `inbox_triage` (every 4h — classifies unread Gmail items with Gemini Flash-Lite, ≤10 tokens)
- **New deps:** `pymupdf>=1.24.0`, `python-docx>=1.1.0`, `google-cloud-storage>=2.18.0`
- **Tests:** `test_documents.py` (10 tests) — 68/68 passing

### Changed (Frontend)
- **`AICoachChat.tsx`** — paperclip button now functional: file picker + drag-and-drop on chat area; file chips with processing state; `DocumentConfirmCard` renders extraction summary, domain tags, sensitivity tier label, toggleable action items, Confirm/Skip buttons; `documentsApi` wired throughout
- **`lib/api.ts`** — `documentsApi` added: `upload`, `status`, `confirm`, `skip`, `list`

---

## [0.6.0] 2026-04-14 — Sprint 6: Kanban + Planner + Home Screen

### Added (Backend)
- **Tasks API:** `GET /kanban`, `POST/GET/PUT/DELETE /tasks/{id}`, `POST /tasks/{id}/move`, `POST /tasks/bulk` — statuses: `todo | in_progress | waiting | done | archived`
- **Planner API:** `GET /planner`, `GET /planner/priority`, `GET /planner/agenda`, item CRUD + complete, `POST /planner/sync/google` stub
- **Homescreen API:** `GET /homescreen` (cache-first, 6-hour TTL via `stale_after`), `POST /homescreen/refresh`, `POST /homescreen/items/{id}/complete`, `POST /homescreen/items/{id}/snooze`
- **Prioritiser service:** `app/services/prioritiser.py` — `priority_score()` rule-based scoring: non-movable +50, overdue +60, due today +40, priority label weights, domain weights, goal linkage bonus. Zero LLM tokens
- **`today_items()`, `week_items()`, `month_items()`, `year_items()`** — homescreen panel builders using priority scorer
- **Celery tasks:** `regenerate_homescreen` (6 AM daily), `archive_done_tasks` (2 AM daily, archives `done` tasks >14 days old)
- **DB migrations:** `002_tasks.sql`, `003_planner.sql`, `004_important_dates.sql`, `005_homescreen_cache.sql` (all with RLS)
- **Tests:** `test_tasks.py` (7), `test_planner.py` (8 incl. prioritiser unit tests), `test_homescreen.py` (4) — 58/58 total passing

### Added (Frontend)
- **Kanban board:** `/kanban` — dnd-kit 4-column board (To Do / In Progress / Waiting / Done), optimistic drag updates, domain/priority filter bar, slide-panel edit. `dynamic(ssr:false)` wrapper
- **Planner:** `/planner` — react-big-calendar with Week/Day/Month/Priority views, domain colour coding, quick-add on date click. `dynamic(ssr:false)` wrapper
- **`KanbanCard.tsx`** — `useSortable` drag handle, domain badge, priority dot, due date
- **`PlannerEvent.tsx`** — react-big-calendar event renderer with domain colour bar
- **`lib/api.ts`** — `tasksApi`, `plannerApi`, `homescreenApi` added
- **New deps:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `react-big-calendar`, `@types/react-big-calendar`

### Changed (Frontend)
- **Dashboard (`/`)** — rewritten as 4-tab home screen (TODAY / THIS WEEK / THIS MONTH / THIS YEAR). Today panel: fixed events (red), top tasks, habits due, coaching question. Week/Month/Year panels: tasks + goals with progress bars. All data from `GET /homescreen` via React Query

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
