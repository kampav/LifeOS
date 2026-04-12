# Changelog

All notable changes to Life OS are documented here.
Format: `[version] YYYY-MM-DD — Persona — Description`

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
