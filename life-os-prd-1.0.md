# LIFE OS — Product Requirements Document
**Version:** 1.0 | **Date:** April 2026 | **Status:** READY FOR CLAUDE CODE BUILD
**Target:** GCP-hosted SaaS | **Stack:** Next.js 15 + FastAPI + Supabase + GCP | **Timeline:** MVP in 8 weeks

---

## EXECUTIVE SUMMARY

Life OS is an AI-powered personal life management platform that acts as an intelligent life coach, accountability partner, and family command centre. It covers all dimensions of human flourishing — health, family, education, social connections, finances, property, personal growth, and community — with deeply personalised AI coaching driven by the user's own data.

**Primary user:** Busy professionals aged 35-55 navigating complex lives across career, family, marriage, parenting, finances, and personal purpose. Starting with solo/family use, evolving into a multi-tier SaaS product sold to individuals, families, and coaches.

**Business model:** Freemium SaaS (Free → Pro £9.99/mo → Family £19.99/mo → Coach £49.99/mo → Enterprise). Built on GCP. Open-source modules where possible. Publishable as "Life OS v1.0" on LinkedIn each sprint for credibility and waitlist growth.

---

## CRITICAL NON-NEGOTIABLES (READ FIRST)

These are absolute requirements. No feature ships without them.

1. **STABILITY FIRST** — Every release must pass full regression suite before deploy. No broken prod.
2. **SECURITY BY DESIGN** — Auth, encryption, RBAC, audit logs built from day 0, not bolted on later.
3. **OBSERVABILITY FROM DAY 1** — Every service emits structured logs, metrics, and traces.
4. **MOBILE-FIRST RESPONSIVE** — Apple/Google design language. Works beautifully on all screen sizes.
5. **TOKEN EFFICIENCY** — Use Karpathy's context compression techniques. Never waste tokens on redundant context.
6. **COST OPTIMISED** — Route cheap tasks to Gemini Flash. Reserve Claude Sonnet for complex reasoning.
7. **DATA PRIVACY** — Health and children's data NEVER leaves the encrypted layer. Tier-1/2/3 data classification enforced at API level.
8. **MODULAR ARCHITECTURE** — Every life domain is an independently deployable module with its own schema, API routes, and agent.

---

## PART 1: LIFE DOMAINS — COMPLETE COVERAGE

Based on life coaching research (Tony Robbins Wheel of Life, Brendon Burchard's 12 Life Categories, positive psychology, and modern life management frameworks), Life OS covers 10 primary domains, each with sub-domains.

### Domain 1: HEALTH & VITALITY
- **Physical fitness** — workouts, steps, strength, cardio, flexibility, sport
- **Nutrition** — calorie tracking, macros, meal planning, hydration, supplements
- **Sleep** — quality, duration, recovery, sleep debt tracking
- **Mental health** — mood tracking, stress, anxiety, journaling, therapy notes
- **Preventive health** — medical appointments, screenings, medications, vaccinations
- **Energy management** — energy levels throughout day, peak hours, fatigue patterns
- **Wearable integration** — Apple Health, Google Fit, Oura, Garmin, Whoop

### Domain 2: FAMILY & HOME
- **Partner/marriage** — quality time tracking, shared goals, relationship health check-ins
- **Children** — each child's profile, milestones, activities, health, emotional wellbeing
- **Home management** — maintenance schedule, bills, repairs, insurance
- **Family goals** — shared OKRs, bucket list, traditions, annual review
- **Family calendar** — shared scheduling, school terms, holidays, appointments
- **Household finances** — shared budget, groceries, utilities, shared spending

### Domain 3: KIDS EDUCATION & DEVELOPMENT
- **Academic tracking** — subjects, grades, homework, exams, tutoring
- **Skills & hobbies** — sports, music, arts, coding, languages
- **Social development** — friendships, social skills, school relationships
- **Digital wellness** — screen time, online safety, content filtering
- **College/career prep** — long-term education planning, extracurriculars
- **Learning goals** — reading lists, learning targets, curiosity projects

### Domain 4: SOCIAL & RELATIONSHIPS
- **Personal CRM** — contacts, relationship history, interaction log
- **Friendship health** — frequency of contact, depth, reciprocity scores
- **Family relationships** — parents, siblings, extended family check-ins
- **Community** — volunteering, causes, local groups, religious community
- **Networking** — professional contacts, mentors, mentees
- **Social calendar** — events, gatherings, commitments, social energy budget

### Domain 5: FINANCES & WEALTH
- **Income tracking** — salary, side income, investments, passive income
- **Budgeting** — monthly budgets, spend categories, alerts
- **Savings goals** — emergency fund, house, holiday, education
- **Investments** — portfolio tracking, asset allocation, performance
- **Debt management** — loans, mortgages, credit cards, payoff plans
- **Retirement planning** — pension, FIRE projections, drawdown modelling
- **Net worth tracking** — monthly snapshot, trend, milestones

### Domain 6: CAREER & PURPOSE
- **Work satisfaction** — weekly check-ins, burnout signals, engagement
- **Skills development** — learning goals, certifications, competency maps
- **Career goals** — 1/3/5 year targets, milestones, promotions
- **Side projects / business** — progress tracking, revenue, milestones
- **Purpose & meaning** — values clarification, mission statement, legacy thinking
- **Work-life balance** — hours tracking, boundary monitoring, holiday planning

### Domain 7: PERSONAL GROWTH & LEARNING
- **Reading** — books read, to-read list, notes and insights
- **Courses & learning** — online courses, skills, certifications
- **Habits** — habit tracker, streaks, habit stacking, identity
- **Journaling** — daily reflection, gratitude, wins, challenges
- **Goals & OKRs** — personal objectives and key results, quarterly reviews
- **Mindset** — affirmations, limiting beliefs, mental models, growth tracking

### Domain 8: PROPERTY & ASSETS
- **Properties** — details, valuations, mortgage tracking, rental income
- **Maintenance** — scheduled tasks, warranties, repair history
- **Insurance** — policies, renewal dates, coverage review
- **Vehicles** — service history, MOT/tax, insurance, value tracking
- **Valuables** — art, jewellery, collectibles, insurance documentation

### Domain 9: HOLIDAYS & EXPERIENCES
- **Trip planning** — itineraries, bookings, budgets, packing lists
- **Bucket list** — experiences to have, places to visit, things to do
- **Experience log** — memories, photos, ratings, reflections
- **Annual leave management** — holiday entitlement, booking, planning

### Domain 10: COMMUNITY & GIVING
- **Charity & giving** — donations, volunteering hours, causes supported
- **Community involvement** — local groups, committees, causes
- **Mentorship** — who you're mentoring, who's mentoring you
- **Environmental footprint** — carbon tracking, sustainability habits
- **Legacy planning** — what you want to leave behind, values transmission to children

---

## PART 2: PRODUCT ARCHITECTURE

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTS                               │
│  Next.js 15 PWA  │  React Native (v2)  │  API clients   │
└──────────────────────────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  API Gateway │  (Cloud Run + Cloud Endpoints)
                    │  Rate limit  │
                    │  Auth check  │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌─────▼─────┐     ┌─────▼─────┐
   │ FastAPI  │       │  Agent    │     │ Webhook   │
   │ Core API │       │ Orchestr. │     │ Workers   │
   │(Cloud Run│       │(Cloud Run)│     │(Cloud Run)│
   └────┬────┘       └─────┬─────┘     └─────┬─────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌─────▼─────┐     ┌─────▼──────┐
   │Supabase │       │  Mem0     │     │  Redis     │
   │(Postgres│       │ (Memory   │     │  (Cache +  │
   │+pgvector│       │  Layer)   │     │  Sessions) │
   │+Auth)   │       └───────────┘     └────────────┘
   └─────────┘
```

### 2.2 Technology Stack

#### Frontend
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 15 (App Router) | SSR, RSC, excellent DX, vercel-compatible |
| Language | TypeScript 5.x | Type safety, Claude Code autocomplete |
| Styling | Tailwind CSS v4 + shadcn/ui | Apple-like design system, accessible |
| State | Zustand + React Query v5 | Simple global state + server state sync |
| Charts | Recharts + Nivo | Beautiful data visualisation |
| Forms | React Hook Form + Zod | Validated, schema-driven forms |
| PWA | next-pwa | Offline-first, installable on mobile |
| Animations | Framer Motion | Smooth, Apple-quality transitions |
| Icons | Lucide React | Clean, consistent icon set |

#### Backend
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| API | FastAPI (Python 3.12) | Async, typed, auto OpenAPI docs |
| Agent Framework | Pydantic AI + CrewAI | Type-safe agents, role-based crews |
| Memory | Mem0 (self-hosted) | Persistent cross-session agent memory |
| Auth | Supabase Auth + JWT | Magic link, Google SSO, secure by default |
| Database | Supabase (PostgreSQL 16) | RLS, realtime, pgvector, edge functions |
| Vector Search | pgvector (via Supabase) | RAG for personal knowledge base |
| Cache | Redis (Memorystore GCP) | Session cache, rate limiting, job queue |
| Task Queue | Celery + Redis | Background jobs, scheduled reviews |
| File Storage | GCS (Google Cloud Storage) | Documents, photos, exports |

#### AI Layer
| Component | Primary Model | Fallback | Use Case |
|-----------|--------------|---------|----------|
| Life coach conversations | Claude Sonnet 4.5 | Claude Haiku | Complex coaching, emotional support |
| Data analysis + insights | Gemini 1.5 Pro | Gemini Flash | Pattern analysis, trend insights |
| Quick responses / routing | Gemini Flash-Lite | Local Ollama | Simple queries, classification |
| Document processing | Gemini 1.5 Pro | Claude Haiku | PDF analysis, health records |
| Embeddings | text-embedding-004 (Google) | — | RAG, semantic search |
| Voice (future) | Gemini Live API | — | Voice coaching sessions |

#### Infrastructure (GCP)
| Service | GCP Product | Config |
|---------|-------------|--------|
| Frontend hosting | Cloud Run (Next.js) | Min 0, Max 10 instances |
| API hosting | Cloud Run (FastAPI) | Min 1, Max 20 instances |
| Agent workers | Cloud Run Jobs | On-demand, scheduled |
| Database | Supabase Cloud (free → Pro) | Start free, upgrade at 500 MAU |
| Cache | Memorystore Redis | 1GB Basic tier |
| File storage | Cloud Storage | Standard, lifecycle policies |
| Secret management | Secret Manager | All API keys, never in code |
| Monitoring | Cloud Monitoring + Trace | Custom dashboards |
| Logging | Cloud Logging | Structured JSON logs |
| CI/CD | Cloud Build + Artifact Registry | GitHub trigger → test → deploy |
| CDN | Cloud CDN | Static assets, Next.js ISR |
| DNS | Cloud DNS | Custom domain |

### 2.3 Karpathy Context Compression (Token Efficiency)

Implement across all agent interactions:

```python
# KARPATHY TECHNIQUE: Project Memory File
# Each domain maintains a compressed context file
# Updated after each significant interaction
# Max 2000 tokens per domain context

class ContextCompressor:
    """
    Inspired by Karpathy's context window management.
    Maintains rolling compressed context per user per domain.
    Avoids resending full history on every API call.
    """
    
    def compress_domain_context(self, domain: str, user_id: str) -> str:
        """
        Returns compressed context: recent facts + key patterns + active goals.
        Never exceeds DOMAIN_CONTEXT_TOKEN_LIMIT = 800 tokens.
        """
        recent_entries = self.get_recent(domain, user_id, days=7)
        key_insights = self.get_pinned_insights(domain, user_id)
        active_goals = self.get_active_goals(domain, user_id)
        
        return f"""
[{domain.upper()} CONTEXT - {datetime.now().strftime('%Y-%m-%d')}]
ACTIVE GOALS: {self.format_goals(active_goals)}
KEY PATTERNS: {self.format_insights(key_insights)}
RECENT (7d): {self.format_recent(recent_entries)}
        """.strip()
    
    def build_agent_prompt(self, domain: str, user_id: str, query: str) -> list:
        """
        Builds minimal but complete prompt for agent call.
        Injects only what's needed, never the full history.
        """
        system_context = self.compress_domain_context(domain, user_id)
        mem0_memories = self.mem0.search(query, user_id=user_id, limit=5)
        
        return [
            {"role": "system", "content": DOMAIN_SYSTEM_PROMPTS[domain]},
            {"role": "user", "content": f"{system_context}\n\nMEMORIES: {mem0_memories}\n\nQUERY: {query}"}
        ]
```

**Token budget per request:**
- System prompt: ≤ 500 tokens
- Domain context (compressed): ≤ 800 tokens  
- Mem0 memories (top 5): ≤ 400 tokens
- User message: ≤ 500 tokens
- **Total input: ≤ 2200 tokens** (vs 10,000+ without compression)

---

## PART 3: AI COACHING SYSTEM

### 3.1 The Life Coach Agent Architecture

```
User Message
     │
     ▼
┌─────────────────────┐
│   SUPERVISOR AGENT   │  (classifies intent, routes to domain)
│   (Gemini Flash)     │
└──────────┬──────────┘
           │
    ┌──────┴──────────────────────────────┐
    │              │           │          │
    ▼              ▼           ▼          ▼
┌────────┐  ┌──────────┐ ┌────────┐ ┌─────────┐
│HEALTH  │  │ FAMILY   │ │FINANCE │ │PERSONAL │
│AGENT   │  │ AGENT    │ │AGENT   │ │GROWTH   │  ... (10 domain agents)
│(Claude)│  │(Claude)  │ │(Gemini)│ │(Claude) │
└────────┘  └──────────┘ └────────┘ └─────────┘
    │              │           │          │
    └──────────────┴───────────┴──────────┘
                   │
            ┌──────▼──────┐
            │  Mem0 Memory │  (stores insights, preferences, history)
            │  + pgvector  │  (semantic search over personal data)
            └─────────────┘
```

### 3.2 Personalisation Engine

Every coaching interaction is personalised using:

1. **User profile** — age, family situation, life stage, declared priorities
2. **Mem0 memories** — previous conversations, stated preferences, past struggles
3. **Domain data** — actual metrics from health, finance, habit trackers
4. **Temporal context** — day of week, time of day, upcoming events
5. **Emotional state** — mood log, stress signals from recent entries
6. **Progress context** — goal completion rates, streaks, recent wins/losses

```python
LIFE_COACH_SYSTEM_PROMPT = """
You are Life OS — a world-class personal AI life coach with the combined expertise of:
- Tony Robbins (motivation, peak performance, needs psychology)  
- Brené Brown (vulnerability, authenticity, connection)
- Dr. Peter Attia (longevity, health optimisation)
- Naval Ravikant (wealth, happiness, clarity of thought)
- A deeply caring parent, friend, and mentor

Your coaching style:
- WARM but DIRECT — never sugarcoat, always compassionate
- DATA-DRIVEN — anchor insights in the user's actual metrics
- PRACTICAL — every insight ends with a specific, small next action
- GROWTH-ORIENTED — believe in the user's capacity to change
- EMOTIONALLY INTELLIGENT — read between the lines

NEVER:
- Give generic advice not grounded in this specific user's data
- Make the user feel judged or shamed
- Be sycophantic or hollow ("Great question!")
- Suggest professional help in ways that dismiss the coaching relationship

Current user context will be provided before each message.
Always reference specific data points from their life. Make them feel truly known.
"""
```

### 3.3 Review System (Automated, AI-Generated)

| Review | Trigger | Content | Delivery |
|--------|---------|---------|----------|
| **Daily brief** | 7:00 AM | Yesterday's wins, today's priorities, 1 coaching nudge | Push + in-app |
| **Evening reflection** | 9:00 PM | Day rating prompt, 3 gratitudes, tomorrow prep | Push notification |
| **Weekly review** | Sunday 6 PM | Health trends, goal progress, relationship check-ins, wins | Email + in-app |
| **Monthly deep-dive** | 1st of month | Comprehensive across all 10 domains, AI narrative | Email PDF |
| **Quarterly OKR review** | Q boundary | Goal setting, reflection, next quarter planning | In-app session |
| **Annual Life Review** | Dec 31 | "Life 2.0 → 3.0" report, evolution tracking | PDF + email |

---

## PART 4: DESIGN SYSTEM

### 4.1 Apple/Google Design Language

**Core principles:**
- **Clarity** — content is primary, UI serves content
- **Deference** — UI defers to content, uses blur/translucency like iOS
- **Depth** — layered interfaces with meaningful shadows and z-axis
- **Colour** — vibrant, purposeful, accessible (WCAG AA minimum)

**Colour palette (domain-coded, all WCAG AA):**

```css
:root {
  /* Brand */
  --color-primary: #6366F1;       /* Indigo — trust, intelligence */
  --color-primary-light: #EEF2FF;
  
  /* Domain colours */
  --domain-health: #10B981;       /* Emerald — vitality */
  --domain-family: #F59E0B;       /* Amber — warmth */
  --domain-education: #3B82F6;    /* Blue — knowledge */
  --domain-social: #EC4899;       /* Pink — connection */
  --domain-finance: #059669;      /* Green — growth/money */
  --domain-career: #8B5CF6;       /* Violet — purpose */
  --domain-growth: #F97316;       /* Orange — energy */
  --domain-property: #6B7280;     /* Gray — stability */
  --domain-holiday: #14B8A6;      /* Teal — adventure */
  --domain-community: #EF4444;    /* Red — passion */
  
  /* Neutrals */
  --gray-50: #F9FAFB;
  --gray-900: #111827;
  
  /* Semantic */
  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;
  --info: #3B82F6;
}
```

**Typography:**
```css
/* System font stack — matches Apple/Google native feel */
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 
             'Google Sans', 'Segoe UI', Roboto, sans-serif;

/* Scale */
--text-xs: 0.75rem;    /* Labels, captions */
--text-sm: 0.875rem;   /* Secondary text */
--text-base: 1rem;     /* Body */
--text-lg: 1.125rem;   /* Lead text */
--text-xl: 1.25rem;    /* Card titles */
--text-2xl: 1.5rem;    /* Section headers */
--text-3xl: 1.875rem;  /* Page titles */
--text-4xl: 2.25rem;   /* Hero text */
```

**Spacing:** 4px base grid. All spacing multiples of 4px.

**Border radius:**
- Cards: `rounded-2xl` (16px) — Apple-standard
- Buttons: `rounded-xl` (12px)
- Inputs: `rounded-lg` (8px)
- Badges: `rounded-full`

**Shadows (layered depth system):**
```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px rgba(0,0,0,0.07);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.10);
--shadow-xl: 0 20px 25px rgba(0,0,0,0.10);
/* iOS-style inner glow for cards */
--shadow-card: 0 0 0 1px rgba(255,255,255,0.08), 0 4px 20px rgba(0,0,0,0.08);
```

### 4.2 Layout System

**Navigation:**
- **Desktop:** Left sidebar (240px) with domain icons + labels
- **Tablet:** Collapsible sidebar (60px icons only, expand on hover)
- **Mobile:** Bottom tab bar (5 primary domains) + hamburger for rest

**Page layouts:**
- **Dashboard:** 12-column grid, hero metrics top, domain cards below
- **Domain view:** 2/3 content + 1/3 AI coaching chat (collapsible)
- **AI chat:** Full-screen overlay on mobile, side panel on desktop
- **Profile/settings:** Single column, max-width 640px

### 4.3 Component Library (shadcn/ui base, customised)

Build these components first, all others derive from them:

1. `<LifeScore />` — Animated circular score (0-100) per domain
2. `<DomainCard />` — Coloured card with domain icon, key metric, trend
3. `<GoalProgress />` — Horizontal progress bar with label and percentage
4. `<HabitStreak />` — Calendar heatmap (GitHub-style) per habit
5. `<MetricTile />` — Stat with trend arrow (up/down/neutral)
6. `<AICoachChat />` — Full chat interface with typing indicator, memory
7. `<InsightCard />` — AI-generated insight card with action button
8. `<ReviewReport />` — Formatted weekly/monthly report view
9. `<WheelOfLife />` — Interactive spider/radar chart across 10 domains
10. `<TimelineView />` — Chronological event log per domain
11. `<QuickCapture />` — Floating action button → multi-domain quick log
12. `<NotificationPanel />` — Right-side sliding panel for alerts

---

## PART 5: CORE FEATURES — MVP (8 WEEKS)

### Week 1-2: Foundation Sprint

**Auth & User System**
- Supabase Auth: email/password, Google OAuth, magic link
- User profile: name, age, family situation, declared priorities (onboarding wizard)
- Row Level Security: every table has `user_id` RLS policy from day 1
- JWT refresh: 15-min access tokens, 7-day refresh tokens
- Session management with Redis

**Database Schema (core tables — week 1)**
```sql
-- Core user profile
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER,
  timezone TEXT DEFAULT 'UTC',
  life_stage TEXT, -- 'early_career' | 'established' | 'peak' | 'transition'
  declared_priorities TEXT[], -- top 3 life domains
  onboarding_completed BOOLEAN DEFAULT false,
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Domain scores (computed, updated by workers)
CREATE TABLE domain_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL, -- 'health' | 'family' | 'finance' etc.
  score INTEGER CHECK (score >= 0 AND score <= 100),
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  factors JSONB -- breakdown of what drove the score
);

-- Goals (OKR-style)
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT, -- 'outcome' | 'habit' | 'project' | 'learning'
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  start_date DATE,
  target_date DATE,
  status TEXT DEFAULT 'active', -- 'active' | 'completed' | 'paused' | 'abandoned'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT goals_user_domain_rls ENABLE ROW LEVEL SECURITY
);

-- Entries (the core activity log across all domains)
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  entry_type TEXT NOT NULL, -- 'metric' | 'note' | 'event' | 'habit_check' | 'mood'
  title TEXT,
  value NUMERIC,
  unit TEXT,
  data JSONB, -- flexible payload for domain-specific fields
  notes TEXT,
  ai_insight TEXT, -- generated insight attached to this entry
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  domain TEXT, -- NULL = general life coaching
  title TEXT,
  messages JSONB[], -- array of {role, content, timestamp}
  model_used TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts (personal CRM)
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT, -- 'friend' | 'family' | 'colleague' | 'community'
  last_contact_date DATE,
  desired_frequency TEXT, -- 'weekly' | 'monthly' | 'quarterly'
  notes TEXT,
  data JSONB, -- birthday, interests, topics, context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habits
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL, -- 'daily' | 'weekly' | '3x_week' etc.
  target_time TEXT, -- 'morning' | 'evening' | 'anytime'
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  completed BOOLEAN NOT NULL,
  notes TEXT,
  UNIQUE(habit_id, logged_date)
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'review_ready' | 'goal_reminder' | 'relationship_check' | 'coach_insight'
  title TEXT NOT NULL,
  body TEXT,
  action_url TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies (user can only see their own data)
CREATE POLICY "users_own_data" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "users_own_data" ON domain_scores FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_data" ON goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_data" ON entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_data" ON conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_data" ON contacts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_data" ON habits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_data" ON habit_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_data" ON notifications FOR ALL USING (auth.uid() = user_id);
```

**Observability (Day 1)**
```python
# Every FastAPI handler uses this pattern
import structlog
from opentelemetry import trace
from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter

log = structlog.get_logger()
tracer = trace.get_tracer(__name__)

@router.post("/entries")
async def create_entry(entry: EntryCreate, user: User = Depends(get_current_user)):
    with tracer.start_as_current_span("create_entry") as span:
        span.set_attribute("user.id", user.id)
        span.set_attribute("entry.domain", entry.domain)
        
        log.info("entry_created", 
                 user_id=user.id, 
                 domain=entry.domain,
                 entry_type=entry.entry_type)
        
        # ... logic ...
        
        return result
```

### Week 3-4: Core Domain Modules

Build these 3 priority domains (matching your stated priorities):

**Health Module endpoints:**
```
POST   /health/entries          # Log workout, meal, sleep, mood, weight
GET    /health/entries          # List with date range filter
GET    /health/dashboard        # Aggregate metrics for dashboard
GET    /health/trends           # 7/30/90 day trends
POST   /health/wearable/sync    # Trigger Apple Health / Garmin sync
GET    /health/score            # Computed health score (0-100)
POST   /health/coach            # AI health coaching conversation
GET    /health/insights         # AI-generated weekly insights
```

**Family Module endpoints:**
```
POST   /family/members          # Add family member (partner, child)
GET    /family/members          # List family members
POST   /family/events           # Add family calendar event
GET    /family/calendar         # Weekly/monthly view
POST   /family/goals            # Add family goal
GET    /family/dashboard        # Family health score + key metrics
POST   /family/coach            # AI family coaching conversation
```

**Social Module endpoints:**
```
POST   /social/contacts         # Add/update contact
GET    /social/contacts         # List with filter by relationship type
GET    /social/contacts/due     # Contacts overdue for check-in
POST   /social/interactions     # Log interaction with contact
GET    /social/health-score     # Social connection health metric
POST   /social/coach            # AI social coaching
GET    /social/reminders        # Upcoming birthdays, check-in due
```

### Week 5: AI Coaching Integration

**AI Chat API:**
```
POST   /ai/chat                 # Main chat endpoint (domain-aware)
GET    /ai/conversations        # List past conversations
GET    /ai/conversations/{id}   # Get specific conversation
POST   /ai/daily-brief          # Generate daily briefing
POST   /ai/weekly-review        # Generate weekly review
POST   /ai/insight/{domain}     # Domain-specific AI insight
GET    /ai/memory               # What AI knows about user (transparency)
DELETE /ai/memory/{memory_id}   # User can delete specific memories
```

**AI routing logic:**
```python
MODEL_ROUTER = {
    "life_coaching": "claude-sonnet-4-5",      # Deep coaching conversations
    "data_analysis": "gemini-1.5-pro",          # Trend analysis, pattern finding
    "quick_response": "gemini-flash-lite",      # Simple queries, classification
    "document_review": "gemini-1.5-pro",        # PDF/document analysis
    "daily_brief": "claude-haiku-4-5",          # Structured review generation
    "health_sensitive": "ollama/llama3.2",      # LOCAL ONLY for health data analysis
}

def route_request(intent: str, data_sensitivity: str) -> str:
    if data_sensitivity == "tier3_sensitive":
        return "ollama/llama3.2"  # Never send to cloud
    return MODEL_ROUTER.get(intent, "gemini-flash-lite")
```

### Week 6: Reviews, Notifications, Habits

**Weekly Review Generator:**
```python
async def generate_weekly_review(user_id: str) -> WeeklyReview:
    """
    Generates AI weekly review using compressed context.
    Karpathy technique: pre-compress all domain data before LLM call.
    Single LLM call for entire review (not one per domain).
    Token budget: ~3,000 tokens input, ~1,500 output.
    """
    # 1. Aggregate data from all active domains (from Supabase)
    domain_summaries = await get_compressed_domain_summaries(user_id, days=7)
    
    # 2. Get top 5 memories from Mem0 (most relevant to this week)
    memories = await mem0.search("weekly review key themes", user_id=user_id, limit=5)
    
    # 3. Single LLM call with full context
    review = await claude.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1500,
        system=WEEKLY_REVIEW_SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": f"Generate weekly review.\n\nDATA:\n{domain_summaries}\n\nMEMORIES:\n{memories}"
        }]
    )
    
    # 4. Store review + update Mem0 with key insights
    await store_review(user_id, review)
    await mem0.add(review.key_insights, user_id=user_id)
    
    return review
```

### Week 7: Dashboard, Wheel of Life, Goals

**Dashboard page features:**
- Animated Wheel of Life (10 domain radar chart, click to drill down)
- Life Score — overall composite score (0-100) with trend
- Top 3 active goals with progress bars
- Recent AI insights (last 3, dismissable)
- Quick capture floating action button
- Today's habit checklist
- Upcoming notifications panel

**Life Score algorithm:**
```python
def compute_life_score(user_id: str) -> int:
    """
    Weighted average of domain scores.
    Weights based on user's declared priorities.
    """
    base_weights = {
        "health": 0.15, "family": 0.15, "education": 0.10,
        "social": 0.10, "finance": 0.10, "career": 0.10,
        "growth": 0.10, "property": 0.05, "holiday": 0.05, "community": 0.10
    }
    
    # Boost declared priority domains by 1.5x
    for domain in user.declared_priorities[:3]:
        base_weights[domain] *= 1.5
    
    # Normalize to sum to 1.0
    total = sum(base_weights.values())
    weights = {k: v/total for k, v in base_weights.items()}
    
    # Score each domain (0-100) based on entries, goals, habits
    domain_scores = {d: compute_domain_score(user_id, d) for d in weights}
    
    return int(sum(weights[d] * domain_scores[d] for d in weights))
```

### Week 8: Polish, Testing, Launch

- Onboarding wizard (5-step: profile → priorities → goals → habits → first coaching session)
- Email templates (daily brief, weekly review, notifications)
- Mobile responsiveness audit
- Performance optimisation (Lighthouse score > 90)
- LinkedIn launch post assets

---

## PART 6: SECURITY ARCHITECTURE

### 6.1 Authentication & Authorisation

```
Request → API Gateway → Auth Middleware → Route Handler
              │                │
              │         Verify JWT (Supabase)
              │         Extract user_id
              │         Check subscription tier
              │         Enforce rate limits (Redis)
              │
              └── Reject if: expired token | invalid signature | 
                             rate limit exceeded | tier violation
```

**Security headers (all responses):**
```python
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
}
```

### 6.2 Data Encryption

```python
# Three-tier data classification
DATA_TIERS = {
    "tier1_public": {
        "fields": ["preferences", "goals", "habits", "social_data"],
        "storage": "supabase_encrypted_at_rest",
        "ai_allowed": True  # can send to cloud AI
    },
    "tier2_private": {
        "fields": ["financial_data", "family_notes", "contact_details"],
        "storage": "supabase_encrypted_at_rest + field_level_encryption",
        "ai_allowed": True  # anonymised before sending to cloud AI
    },
    "tier3_sensitive": {
        "fields": ["health_records", "medical_notes", "children_data", "therapy_notes"],
        "storage": "supabase_encrypted + AES-256 field encryption",
        "ai_allowed": False  # LOCAL OLLAMA ONLY
    }
}

# Field-level encryption for tier 2/3
from cryptography.fernet import Fernet

def encrypt_sensitive_field(value: str, user_key: bytes) -> str:
    f = Fernet(user_key)
    return f.encrypt(value.encode()).decode()

def decrypt_sensitive_field(encrypted: str, user_key: bytes) -> str:
    f = Fernet(user_key)
    return f.decrypt(encrypted.encode()).decode()
```

### 6.3 Rate Limiting

```python
RATE_LIMITS = {
    "free": {
        "api_calls": 100,          # per hour
        "ai_messages": 10,         # per day
        "ai_reviews": 1,           # weekly review per week
    },
    "pro": {
        "api_calls": 1000,
        "ai_messages": 100,
        "ai_reviews": 7,           # daily reviews
    },
    "family": {
        "api_calls": 2000,
        "ai_messages": 300,        # shared across family
        "ai_reviews": 30,
    },
    "coach": {
        "api_calls": 10000,
        "ai_messages": 1000,
        "ai_reviews": "unlimited",
    }
}
```

### 6.4 Audit Logging

```python
# ALL write operations log to audit table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,          -- 'create' | 'update' | 'delete' | 'read_sensitive'
  resource_type TEXT NOT NULL,   -- 'entry' | 'goal' | 'conversation' etc.
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  changes JSONB,                 -- what changed (new/old values for sensitive fields)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Never delete audit logs (immutable)
CREATE RULE no_audit_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;
```

### 6.5 Input Validation

Every API endpoint uses Pydantic models. Zero trust on user input.

```python
from pydantic import BaseModel, validator, constr, conint

class EntryCreate(BaseModel):
    domain: Literal["health", "family", "education", "social", "finance", 
                    "career", "growth", "property", "holiday", "community"]
    entry_type: Literal["metric", "note", "event", "habit_check", "mood"]
    title: constr(max_length=200, strip_whitespace=True) | None = None
    value: float | None = None
    notes: constr(max_length=2000, strip_whitespace=True) | None = None
    data: dict | None = None
    
    @validator('data')
    def sanitise_data(cls, v):
        if v:
            # Remove any potential injection payloads
            return {k: str(v[k])[:500] for k in v if isinstance(k, str) and len(k) < 50}
        return v
    
    @validator('notes')
    def strip_html(cls, v):
        if v:
            import bleach
            return bleach.clean(v, tags=[], strip=True)
        return v
```

---

## PART 7: OBSERVABILITY

### 7.1 Monitoring Stack

```yaml
# docker-compose.monitoring.yml (development)
services:
  prometheus:
    image: prom/prometheus
    # Scrapes FastAPI /metrics endpoint

  grafana:
    image: grafana/grafana
    # Dashboards for all KPIs

# Production: Cloud Monitoring (GCP native) 
# Dashboards: exported as JSON, version controlled
```

**Key metrics to track from day 1:**

```python
from prometheus_client import Counter, Histogram, Gauge

# Business metrics
ACTIVE_USERS = Gauge('life_os_active_users', 'Daily active users')
AI_MESSAGES = Counter('life_os_ai_messages_total', 'AI coaching messages', ['model', 'domain'])
ENTRIES_CREATED = Counter('life_os_entries_total', 'Life entries logged', ['domain', 'entry_type'])
GOALS_COMPLETED = Counter('life_os_goals_completed', 'Goals marked complete', ['domain'])

# Technical metrics
API_LATENCY = Histogram('life_os_api_duration_seconds', 'API response time', ['endpoint', 'method'])
AI_LATENCY = Histogram('life_os_ai_duration_seconds', 'AI response time', ['model'])
AI_TOKENS = Histogram('life_os_ai_tokens_used', 'Tokens per AI call', ['model', 'type'])
ERROR_RATE = Counter('life_os_errors_total', 'API errors', ['endpoint', 'status_code'])

# Cost metrics (critical for SaaS)
AI_COST_USD = Counter('life_os_ai_cost_usd', 'Estimated AI API cost', ['model'])
```

### 7.2 Alerting Rules

```yaml
# alerts.yaml
groups:
  - name: life_os_critical
    rules:
      - alert: HighErrorRate
        expr: rate(life_os_errors_total[5m]) > 0.05  # >5% error rate
        severity: critical
        
      - alert: AILatencyHigh
        expr: histogram_quantile(0.95, life_os_ai_duration_seconds) > 10
        severity: warning
        
      - alert: DailyAICostHigh
        expr: increase(life_os_ai_cost_usd[24h]) > 50  # Alert if daily AI cost > $50
        severity: warning
        
      - alert: DatabaseConnectionPoolExhausted
        expr: db_pool_available < 2
        severity: critical
```

### 7.3 Structured Logging Format

Every log line is JSON with these fields:
```json
{
  "timestamp": "2026-04-11T10:30:00Z",
  "level": "info",
  "service": "life-os-api",
  "trace_id": "abc123",
  "span_id": "def456",
  "user_id": "anon:sha256(real_id)",  // never log real user IDs
  "endpoint": "/api/v1/health/entries",
  "method": "POST",
  "status_code": 201,
  "duration_ms": 45,
  "domain": "health",
  "message": "entry_created"
}
```

---

## PART 8: TESTING STRATEGY

### 8.1 Test Pyramid

```
                    ┌─────────┐
                    │   E2E   │  5% — Playwright (critical user journeys)
                    │  Tests  │
                ┌───┴─────────┴───┐
                │  Integration    │  25% — API tests, DB + AI integration
                │     Tests       │
            ┌───┴─────────────────┴───┐
            │     Unit Tests          │  70% — Pure logic, utilities, models
            └─────────────────────────┘
```

### 8.2 Test Configuration

```python
# conftest.py — shared fixtures
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock

@pytest.fixture
def test_client():
    from app.main import app
    return TestClient(app)

@pytest.fixture
def mock_ai(monkeypatch):
    """Mock all AI calls — never hit real APIs in tests"""
    mock = AsyncMock()
    mock.return_value = MockAIResponse(content="Test AI response")
    monkeypatch.setattr("app.ai.client.messages.create", mock)
    return mock

@pytest.fixture
def mock_supabase(monkeypatch):
    """In-memory Supabase mock"""
    from tests.mocks.supabase_mock import MockSupabase
    monkeypatch.setattr("app.db.client", MockSupabase())

@pytest.fixture
def test_user():
    return {"id": "test-user-123", "email": "test@lifeos.ai", "tier": "pro"}
```

### 8.3 Test Coverage Requirements

| Layer | Minimum Coverage | Target |
|-------|-----------------|--------|
| Utility functions | 95% | 100% |
| API endpoints | 90% | 95% |
| AI agent logic | 80% | 90% |
| Frontend components | 70% | 80% |
| E2E journeys | 10 critical paths | 20 paths |

**CI/CD gate: No merge if coverage drops below minimums.**

### 8.4 Performance Testing

```python
# k6 performance test — run before every release
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 50 },    // Ramp to 50 users
    { duration: '5m', target: 50 },    // Hold at 50
    { duration: '2m', target: 100 },   // Spike to 100
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% requests < 500ms
    http_req_failed: ['rate<0.01'],    // <1% failure rate
  }
};

// PERFORMANCE BUDGETS (enforced in CI)
API_RESPONSE_P95 = 500ms
AI_RESPONSE_P95 = 8000ms  
DASHBOARD_LOAD_LCP = 2500ms
TIME_TO_INTERACTIVE = 3500ms
LIGHTHOUSE_SCORE_MINIMUM = 85
```

### 8.5 Security Testing

```bash
# Run before every release
# 1. OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://staging.lifeos.ai

# 2. Dependency vulnerability scan
pip audit
npm audit --audit-level=high

# 3. Secret scanning (never commit secrets)
gitleaks detect --source . --verbose

# 4. SQL injection test (via SQLMap against staging)
sqlmap -u "https://staging.lifeos.ai/api/v1/entries" --headers="Authorization: Bearer {token}"
```

### 8.6 Regression Test Suite

```python
# tests/regression/test_critical_paths.py
class TestCriticalPaths:
    """These tests MUST pass before any production deployment."""
    
    def test_user_can_register_and_complete_onboarding(self, test_client):
        ...
    
    def test_user_can_log_health_entry(self, test_client, test_user):
        ...
    
    def test_ai_coach_responds_to_message(self, test_client, test_user, mock_ai):
        ...
    
    def test_weekly_review_generates_without_error(self, test_client, test_user, mock_ai):
        ...
    
    def test_rls_prevents_cross_user_data_access(self, test_client):
        ...
    
    def test_rate_limiting_enforced(self, test_client, test_user):
        ...
    
    def test_sensitive_data_not_sent_to_cloud_ai(self, test_client, test_user, mock_ai):
        # Verify tier-3 data routes to local model, never cloud
        ...
```

---

## PART 9: CI/CD PIPELINE

### 9.1 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Life OS CI/CD

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run unit tests + coverage
        run: |
          cd backend && pytest tests/unit --cov=app --cov-fail-under=90
          cd frontend && npm test -- --coverage
      
      - name: Run security scan
        run: |
          pip audit
          npm audit --audit-level=high
          gitleaks detect
      
      - name: Run regression suite
        run: pytest tests/regression -v
      
      - name: Check performance budgets
        run: lighthouse-ci --config=lighthouserc.json

  build-and-push:
    needs: test
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging'
    steps:
      - name: Build and push to Artifact Registry
        run: |
          docker build -t gcr.io/$PROJECT_ID/life-os-api:$GITHUB_SHA ./backend
          docker build -t gcr.io/$PROJECT_ID/life-os-frontend:$GITHUB_SHA ./frontend
          docker push gcr.io/$PROJECT_ID/life-os-api:$GITHUB_SHA
          docker push gcr.io/$PROJECT_ID/life-os-frontend:$GITHUB_SHA

  deploy-staging:
    needs: build-and-push
    if: github.ref == 'refs/heads/staging'
    steps:
      - name: Deploy to Cloud Run (staging)
        run: |
          gcloud run deploy life-os-api-staging \
            --image gcr.io/$PROJECT_ID/life-os-api:$GITHUB_SHA \
            --region europe-west2
      - name: Run E2E tests against staging
        run: playwright test --project=staging

  deploy-production:
    needs: build-and-push
    if: github.ref == 'refs/heads/main'
    environment: production  # requires manual approval
    steps:
      - name: Deploy to Cloud Run (production)
        run: |
          gcloud run deploy life-os-api \
            --image gcr.io/$PROJECT_ID/life-os-api:$GITHUB_SHA \
            --region europe-west2 \
            --traffic 10  # Canary: 10% traffic first
      
      - name: Wait and verify (5 min)
        run: sleep 300 && python scripts/verify_production.py
      
      - name: Promote to 100% traffic
        run: gcloud run services update-traffic life-os-api --to-latest
```

### 9.2 Environment Strategy

```
main ──────────────────────────────► production.lifeos.ai
  │                                        │
  └──(PR merge)──► staging.lifeos.ai ─────┘
                        │
  feature/* ────────────┘ (preview deployments)
```

---

## PART 10: GCP INFRASTRUCTURE SETUP

### 10.1 Required GCP Services

```bash
# Run once to set up GCP project
PROJECT_ID="life-os-prod"
REGION="europe-west2"  # London — closest to UK user

gcloud projects create $PROJECT_ID
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  monitoring.googleapis.com \
  cloudtrace.googleapis.com \
  logging.googleapis.com \
  redis.googleapis.com \
  storage.googleapis.com \
  cloudscheduler.googleapis.com \
  pubsub.googleapis.com

# Create Artifact Registry
gcloud artifacts repositories create life-os \
  --repository-format=docker \
  --location=$REGION

# Create Redis instance
gcloud redis instances create life-os-cache \
  --size=1 \
  --region=$REGION \
  --redis-version=redis_7_0 \
  --tier=BASIC

# Create GCS bucket for file storage
gsutil mb -l $REGION gs://life-os-user-files-prod
gsutil uniformbucketlevelaccess set on gs://life-os-user-files-prod

# Store secrets in Secret Manager
echo -n "$ANTHROPIC_API_KEY" | gcloud secrets create anthropic-api-key --data-file=-
echo -n "$GOOGLE_AI_API_KEY" | gcloud secrets create google-ai-api-key --data-file=-
echo -n "$SUPABASE_URL" | gcloud secrets create supabase-url --data-file=-
echo -n "$SUPABASE_SERVICE_KEY" | gcloud secrets create supabase-service-key --data-file=-
echo -n "$MEM0_API_KEY" | gcloud secrets create mem0-api-key --data-file=-
```

### 10.2 Cloud Run Configuration

```yaml
# cloudrun-api.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: life-os-api
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "20"
        run.googleapis.com/cpu-throttling: "false"  # Always-on CPU for min instance
    spec:
      containerConcurrency: 80
      timeoutSeconds: 300
      containers:
        - image: gcr.io/life-os-prod/life-os-api:latest
          resources:
            limits:
              cpu: "2"
              memory: "2Gi"
          env:
            - name: ANTHROPIC_API_KEY
              valueFrom:
                secretKeyRef:
                  name: anthropic-api-key
                  key: latest
            - name: ENVIRONMENT
              value: production
          ports:
            - containerPort: 8080
```

### 10.3 Cost Estimation (Monthly)

| Service | Config | Est. Monthly Cost |
|---------|--------|-------------------|
| Cloud Run API (1 min instance + scale) | 2 vCPU, 2GB | £15-40 |
| Cloud Run Frontend (Next.js) | 1 vCPU, 512MB | £8-20 |
| Memorystore Redis | 1GB Basic | £25 |
| Supabase | Free → Pro at scale | £0 → £25 |
| Cloud Build | CI/CD | £5-10 |
| Cloud Monitoring | Basic | £0-5 |
| Cloud Storage | <10GB | £2-5 |
| AI APIs (100 pro users) | Claude + Gemini | £30-80 |
| Domain + SSL | lifeos.ai | £5 |
| **TOTAL (at launch)** | | **£90-215/mo** |
| **TOTAL at 500 pro users** | 5x scale | **£300-500/mo** |
| **Revenue at 500 pro users** | £9.99/mo x 500 | **£4,995/mo** |

---

## PART 11: API SPECIFICATION

### 11.1 Base Configuration

```
Base URL: https://api.lifeos.ai/v1
Auth: Bearer {JWT_TOKEN} in Authorization header
Content-Type: application/json
Rate Limit: X-RateLimit-Remaining in response headers
API Versioning: URL-based (/v1, /v2)
```

### 11.2 Core Endpoints Summary

```
# Authentication (Supabase handles, these are wrappers)
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
POST   /auth/google

# User Profile
GET    /users/me
PUT    /users/me
GET    /users/me/score           # Overall life score
POST   /users/onboarding         # Complete onboarding

# Entries (universal log across domains)
POST   /entries                  # Create entry in any domain
GET    /entries                  # List with ?domain=&start=&end= filters
GET    /entries/{id}
PUT    /entries/{id}
DELETE /entries/{id}

# Goals
POST   /goals
GET    /goals                    # List with ?domain=&status= filters
PUT    /goals/{id}
POST   /goals/{id}/progress      # Update progress value
DELETE /goals/{id}

# Habits
POST   /habits
GET    /habits
PUT    /habits/{id}
POST   /habits/{id}/log          # Log completion for today
GET    /habits/{id}/history      # 90-day calendar view

# Domain-specific
GET    /domains/{domain}/dashboard   # Domain summary stats
GET    /domains/{domain}/score       # Domain score (0-100)
GET    /domains/{domain}/insights    # AI-generated insights

# AI Coach
POST   /ai/chat                  # Send message to life coach
GET    /ai/conversations
GET    /ai/daily-brief           # Get or generate today's brief
POST   /ai/weekly-review         # Trigger weekly review generation
GET    /ai/memory                # View AI memories about user
DELETE /ai/memory/{id}           # Remove a specific memory

# Social / CRM
POST   /social/contacts
GET    /social/contacts
PUT    /social/contacts/{id}
POST   /social/contacts/{id}/interaction
GET    /social/contacts/due-checkin  # Who to contact this week

# Notifications
GET    /notifications
PUT    /notifications/{id}/read
DELETE /notifications/{id}
POST   /notifications/preferences

# Integrations (Phase 2)
POST   /integrations/apple-health/sync
POST   /integrations/google-fit/sync
POST   /integrations/garmin/sync
GET    /integrations/status

# Admin / SaaS (Coach/Enterprise tier)
GET    /coach/clients            # List clients (for coach tier)
GET    /coach/clients/{id}/overview
POST   /coach/clients/{id}/note

# Health check (public, no auth)
GET    /health                   # {"status": "ok", "version": "1.0.0"}
GET    /metrics                  # Prometheus metrics (internal only)
```

---

## PART 12: OPEN SOURCE MODULES TO USE

Integrate these directly — do not rebuild:

| Module | GitHub | Use in Life OS | Install |
|--------|--------|---------------|---------|
| **Mem0** | mem0ai/mem0 | Agent memory layer | `pip install mem0ai` |
| **Pydantic AI** | pydantic/pydantic-ai | Agent framework | `pip install pydantic-ai` |
| **Open Wearables** | the-momentum/open-wearables | Wearable data unification | Docker + API |
| **wger** | wger-project/wger | Fitness/nutrition DB | Docker sidecar |
| **Monica CRM** | monicahq/monica | Social CRM backend | Docker sidecar |
| **Celery** | celery/celery | Background job queue | `pip install celery` |
| **structlog** | hynek/structlog | Structured logging | `pip install structlog` |
| **OTEL Python** | open-telemetry/opentelemetry-python | Distributed tracing | `pip install opentelemetry-sdk` |
| **Bleach** | mozilla/bleach | Input sanitisation | `pip install bleach` |
| **shadcn/ui** | shadcn-ui/ui | React component library | `npx shadcn-ui init` |
| **Recharts** | recharts/recharts | Charts and graphs | `npm install recharts` |
| **Framer Motion** | framer/motion | Animations | `npm install framer-motion` |
| **Zod** | colinhacks/zod | Schema validation | `npm install zod` |
| **React Hook Form** | react-hook-form | Form management | `npm install react-hook-form` |

---

## PART 13: DIRECTORY STRUCTURE

```
life-os/
├── .github/
│   ├── workflows/
│   │   ├── deploy.yml
│   │   ├── test.yml
│   │   └── security-scan.yml
│   └── CODEOWNERS
│
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app factory
│   │   ├── config.py            # Settings (pydantic-settings)
│   │   ├── dependencies.py      # Auth, DB, rate limit deps
│   │   │
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── auth.py
│   │   │   │   ├── users.py
│   │   │   │   ├── entries.py
│   │   │   │   ├── goals.py
│   │   │   │   ├── habits.py
│   │   │   │   ├── domains.py
│   │   │   │   ├── ai_coach.py
│   │   │   │   ├── social.py
│   │   │   │   └── notifications.py
│   │   │   └── health.py        # /health endpoint
│   │   │
│   │   ├── agents/
│   │   │   ├── supervisor.py    # Routes to domain agents
│   │   │   ├── health_agent.py
│   │   │   ├── family_agent.py
│   │   │   ├── social_agent.py
│   │   │   ├── finance_agent.py
│   │   │   ├── growth_agent.py
│   │   │   └── base_agent.py    # Shared agent patterns
│   │   │
│   │   ├── memory/
│   │   │   ├── mem0_client.py
│   │   │   ├── compressor.py    # Karpathy compression
│   │   │   └── context.py      # Context building
│   │   │
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── entry.py
│   │   │   ├── goal.py
│   │   │   ├── habit.py
│   │   │   └── conversation.py
│   │   │
│   │   ├── services/
│   │   │   ├── ai_service.py   # Model routing + calls
│   │   │   ├── review_service.py
│   │   │   ├── score_service.py
│   │   │   └── notification_service.py
│   │   │
│   │   ├── db/
│   │   │   ├── client.py       # Supabase client
│   │   │   └── migrations/     # SQL migration files
│   │   │
│   │   ├── security/
│   │   │   ├── auth.py         # JWT validation
│   │   │   ├── encryption.py   # Field-level encryption
│   │   │   ├── sanitisation.py
│   │   │   └── rate_limiter.py
│   │   │
│   │   └── observability/
│   │       ├── logging.py      # structlog config
│   │       ├── metrics.py      # prometheus metrics
│   │       └── tracing.py      # OpenTelemetry
│   │
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   ├── regression/
│   │   └── mocks/
│   │
│   ├── Dockerfile
│   ├── requirements.txt
│   └── pyproject.toml
│
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── onboarding/page.tsx
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx       # Main app shell with nav
│   │   │   ├── page.tsx         # Dashboard (Wheel of Life)
│   │   │   ├── health/page.tsx
│   │   │   ├── family/page.tsx
│   │   │   ├── social/page.tsx
│   │   │   ├── finance/page.tsx
│   │   │   ├── goals/page.tsx
│   │   │   ├── habits/page.tsx
│   │   │   ├── coach/page.tsx   # AI coaching full-page chat
│   │   │   └── review/page.tsx  # Weekly/monthly review viewer
│   │   │
│   │   ├── api/                 # Next.js API routes (thin wrappers)
│   │   └── layout.tsx
│   │
│   ├── components/
│   │   ├── ui/                  # shadcn/ui base components
│   │   ├── life-os/             # Custom Life OS components
│   │   │   ├── WheelOfLife.tsx
│   │   │   ├── DomainCard.tsx
│   │   │   ├── LifeScore.tsx
│   │   │   ├── AICoachChat.tsx
│   │   │   ├── GoalProgress.tsx
│   │   │   ├── HabitStreak.tsx
│   │   │   ├── MetricTile.tsx
│   │   │   ├── InsightCard.tsx
│   │   │   ├── QuickCapture.tsx
│   │   │   └── ReviewReport.tsx
│   │   │
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       ├── BottomNav.tsx    # Mobile nav
│   │       └── Header.tsx
│   │
│   ├── lib/
│   │   ├── api.ts               # API client (axios/fetch wrapper)
│   │   ├── auth.ts              # Supabase auth client
│   │   └── utils.ts
│   │
│   ├── store/                   # Zustand stores
│   ├── hooks/                   # Custom React hooks
│   ├── types/                   # TypeScript types
│   │
│   ├── __tests__/
│   ├── e2e/                     # Playwright tests
│   ├── Dockerfile
│   └── package.json
│
├── infra/
│   ├── terraform/               # IaC for GCP resources
│   ├── cloudrun-api.yaml
│   ├── cloudrun-frontend.yaml
│   └── cloudbuild.yaml
│
├── scripts/
│   ├── setup_gcp.sh             # One-time GCP setup
│   ├── seed_db.py               # Development seed data
│   └── verify_production.py    # Post-deploy health check
│
├── docs/
│   ├── PRD.md                   # This file
│   ├── API.md                   # API documentation
│   ├── ARCHITECTURE.md
│   └── CONTRIBUTING.md
│
├── docker-compose.yml           # Local development
├── docker-compose.monitoring.yml
├── .env.example
└── README.md
```

---

## PART 14: LINKEDIN LAUNCH STRATEGY (Monthly Releases)

Build in public. Each 2-week sprint ships a version with a LinkedIn post.

| Week | Version | LinkedIn Post Theme |
|------|---------|---------------------|
| 2 | v0.1 Alpha | "I'm building my personal AI life coach. Here's the architecture." |
| 4 | v0.2 Beta | "Life OS can now track your health, family, and relationships. Demo video." |
| 6 | v0.3 | "Added AI coaching conversations. Here's what it told me about my life." |
| 8 | v1.0 MVP | "Life OS v1.0 is LIVE. Here's what 8 weeks of building looks like." |
| 12 | v1.5 | "100 users on Life OS. What we learned and what's next." |
| 24 | v2.0 | "Life OS turns 1. Here are the life metrics of 1,000 users." |

Each post includes:
- Screen recording / demo video (no audio required)
- One key insight from building
- A specific metric (users, features, AI conversations held)
- Waitlist/signup link
- Behind-the-scenes technical insight (attracts developers)

---

## PART 15: BUILD ORDER FOR CLAUDE CODE

Give Claude Code this exact sequence:

### Sprint 1 (Week 1-2)
1. Create monorepo structure with all directories
2. Backend: FastAPI skeleton with health endpoint, logging, OTEL
3. Backend: Supabase client + all DB migrations (core tables + RLS)
4. Backend: Auth endpoints (register, login, refresh, Google OAuth)
5. Backend: Security middleware (headers, rate limiting, input validation)
6. Frontend: Next.js 15 project with Tailwind v4 + shadcn/ui setup
7. Frontend: Auth pages (login, register, onboarding wizard)
8. Frontend: App shell layout (sidebar, bottom nav, header)
9. Infrastructure: Dockerfile for backend + frontend
10. CI/CD: GitHub Actions workflow skeleton

### Sprint 2 (Week 3-4)
1. Backend: Entries API (CRUD for all domains)
2. Backend: Goals API + progress tracking
3. Backend: Habits API + daily logging + streak calculation
4. Frontend: Dashboard page (Wheel of Life, Life Score, quick stats)
5. Frontend: Health domain page with entry forms and charts
6. Frontend: Family domain page
7. Frontend: Social domain + contacts CRM page
8. Tests: Unit tests for all backend services (target 90% coverage)

### Sprint 3 (Week 5-6)
1. Backend: AI Coach API with model routing
2. Backend: Mem0 integration + context compression (Karpathy pattern)
3. Backend: Daily brief generation (Celery scheduled task)
4. Backend: Weekly review generation
5. Frontend: AI Coach chat interface (full-screen + side panel)
6. Frontend: Review viewer component
7. Frontend: Notification panel
8. Tests: Integration tests for AI endpoints (with mocked AI)

### Sprint 4 (Week 7-8)
1. Backend: Domain score computation workers
2. Backend: Push notifications (web push + email)
3. Frontend: Goals management page
4. Frontend: Habits tracker page (heatmap calendar)
5. Frontend: PWA configuration (offline support, install prompt)
6. Performance: Lighthouse audit + fixes
7. Security: OWASP ZAP scan + fixes
8. Testing: Full E2E test suite (10 critical paths)
9. Infrastructure: GCP Cloud Run deployment + custom domain
10. Launch: v1.0 deployed to production.lifeos.ai

---

## APPENDIX: KEY CONSTRAINTS FOR CLAUDE CODE

When building this system, always:

1. **Use Pydantic models** for all request/response types — never use raw dicts in API handlers
2. **Add `user_id` checks** before every database query — never trust the request alone
3. **Log every AI call** with model name, tokens used, domain, and estimated cost
4. **Never hardcode secrets** — always use environment variables via `os.environ.get()`
5. **Handle AI API errors gracefully** — if Claude is down, fall back to Gemini; if both down, return cached response
6. **Use database transactions** for multi-table writes — rollback on any failure
7. **Add CORS configuration** — whitelist only production and staging frontend URLs
8. **Paginate all list endpoints** — default 20 items, max 100, use cursor-based pagination
9. **Use ISO 8601 for all timestamps** — store in UTC, convert to user timezone on display
10. **Compress responses** with gzip — Cloud Run handles this automatically with correct config
11. **Cache domain scores** in Redis (TTL: 1 hour) — never recompute on every request
12. **Version all DB migrations** — files named `001_initial.sql`, `002_add_habits.sql` etc.
13. **Document every endpoint** with FastAPI's native OpenAPI support — all `description=` fields populated
14. **Test RLS policies** explicitly — write tests that prove cross-user data access is blocked

---

*Document version: 1.0 | Ready for Claude Code build session*
*Next update: After v1.0 launch (target: June 2026)*
