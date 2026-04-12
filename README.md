# Life OS

> AI-powered personal life management across all 10 life domains.  
> Built with Next.js 15 · FastAPI · Supabase · GCP Cloud Run · Claude + Gemini AI

**Live:** https://life-os-frontend-574662870196.europe-west2.run.app  
**API:** https://life-os-api-574662870196.europe-west2.run.app

---

## What is Life OS?

Life OS is an AI life coach and personal command centre covering all dimensions of human flourishing:

| Domain | What it tracks |
|--------|----------------|
| 🏃 Health | Workouts, nutrition, sleep, mood, energy |
| 👨‍👩‍👧 Family | Partner goals, children milestones, home management |
| 📚 Education | Kids' academics, skills, learning goals |
| 👥 Social | Personal CRM, friendship health, check-in reminders |
| 💰 Finance | Income, budgets, savings, investments, net worth |
| 💼 Career | Work satisfaction, skills, projects, purpose |
| 🎯 Growth | Reading, habits, journaling, OKRs, mindset |
| 🏠 Property | Properties, maintenance, vehicles, valuables |
| ✈️ Holidays | Trip planning, bucket list, travel history |
| 🌍 Community | Volunteering, causes, local groups |

---

## Sprint Status

| Sprint | Scope | Status |
|--------|-------|--------|
| Sprint 1 — Foundation | Scaffold, auth, DB schema, CI/CD, GCP deploy | ✅ Complete |
| Sprint 2 — Core modules | Domain pages, entry forms, goals, habits, charts | ✅ Complete |
| Sprint 3 — AI + Reviews | AI coach deep features, weekly review, notifications | 🔄 In Progress |
| Sprint 4 — Polish + Launch | PWA, Lighthouse 90+, onboarding, billing, waitlist | ⏳ Planned |

### Sprint 3 Acceptance Criteria (must all pass before Sprint 4)
- [ ] All 10 domain pages load without crash
- [ ] Entry logging works end-to-end
- [ ] Goals CRUD + progress tracking works
- [ ] Habits daily logging + streaks work
- [ ] AI Coach responds with context-aware messages
- [ ] Daily brief displays on dashboard
- [ ] Weekly review generates successfully
- [ ] Settings profile save works
- [ ] No crashes on any page navigation

---

## Architecture

```
Frontend (Next.js 15)  →  Backend (FastAPI)  →  Supabase PostgreSQL
         ↓                       ↓
   GCP Cloud Run            GCP Cloud Run
         ↓                       ↓
  Secret Manager          Claude + Gemini AI
```

**Stack:** Next.js 15 App Router · TypeScript · Tailwind v4 · React Query  
**Backend:** FastAPI · Python 3.12 · Pydantic v2  
**AI:** Claude Sonnet 4.6 (coaching) · Gemini Flash (analysis/routing)  
**DB:** Supabase (PostgreSQL + pgvector + RLS)  
**Infra:** GCP Cloud Run · Secret Manager · GitHub Actions CI/CD

---

## Quick Start (Local)

```bash
git clone https://github.com/kampav/LifeOS.git && cd LifeOS
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Fill in API keys (see table below)
docker-compose up
# Frontend: http://localhost:3000  |  API: http://localhost:8080
```

| Variable | Source |
|----------|--------|
| SUPABASE_URL + keys | supabase.com → Project Settings → API |
| ANTHROPIC_API_KEY | console.anthropic.com |
| GOOGLE_AI_API_KEY | aistudio.google.com |

---

## Team Personas (How this was built)

This project is built by Pavan orchestrating Claude Code as a multi-persona AI engineering team:

| Persona | Responsibilities |
|---------|-----------------|
| **Architect** | System design, sprint planning, API contracts, ADRs |
| **Frontend Engineer** | Next.js pages, React components, routing, state |
| **Backend Engineer** | FastAPI routes, business logic, DB queries |
| **Design Engineer** | UI polish, design system, mobile-first layouts |
| **AI Engineer** | Prompt engineering, Claude/Gemini integration, memory |
| **Data Engineer** | Schema design, RLS policies, query optimisation |
| **DevOps/SRE** | GCP Cloud Run, CI/CD, secrets, monitoring |

Each sprint, the right persona(s) are delegated the work — Architect designs → Backend implements → Frontend builds → Design polishes → DevOps ships.

---

## Key Engineering Rules (hard-won)

**React 19 + Next.js 15:** Never use `motion.*` (framer-motion) or `ResponsiveContainer` (Recharts) in SSR-rendered components. Use `dynamic(ssr:false)`. React 19 upgraded hydration mismatches from warnings to hard crashes.

**API null safety:** Supabase returns `null` (not `[]`) for empty tables. `useQuery`'s `= []` default fires only for `undefined`. Always use `Array.isArray(r.data) ? r.data : []` in queryFns.

**Timezone rendering:** `new Date()` in SSR components causes hydration mismatches (UTC server vs local browser). Compute in `useEffect`, use `suppressHydrationWarning`.

---

## Licence

Private — not open source yet.
