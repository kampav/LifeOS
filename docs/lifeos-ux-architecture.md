# LifeOS UX and Architecture Direction

## Executive Summary

LifeOS should feel like one operating system, not a collection of modules. The product model is:

1. Capture anything.
2. Decide once.
3. Act from the right surface.
4. Remember what matters.
5. Let the system improve the next session.

The visible UI should avoid exposing behavioural-design jargon. Users should simply feel that LifeOS is easy to return to because it removes friction, remembers context, and always offers one useful next move.

## Experience Principles

- **One shell:** every page inherits the same Home, Planning, Coach and Domains navigation model.
- **One inbox:** email, calendar, documents, manual notes and AI captures land in Life Inbox before being routed.
- **One decision model:** every unresolved item can become `do`, `schedule`, `remember`, `snooze` or `archive`.
- **One next action:** dashboards should prefer a single recommended action over a grid of equal-priority widgets.
- **User-shaped areas:** each life area can be renamed, hidden, weighted and given personal nudge wording.
- **Quiet intelligence:** nudges are sparse, explainable and action-linked.
- **Second brain by default:** useful knowledge should be captured once, connected to decisions, and retrievable from Coach.

## UX System

### Shell

- Desktop: persistent left command rail inspired by the Stitch reference.
- Mobile: five-item bottom nav with Home, Plan, Coach, Profile and Domains.
- Top-level pages should not invent local navigation unless the task requires it.

### Surface Hierarchy

- **Home:** command centre and next best action.
- **Planning:** calendar, priority view and time-based commitments.
- **Coach:** conversational reasoning with access to tasks, plans, goals, inbox and second brain.
- **Domains:** meaningful life areas, not feature buckets.
- **Profile and Preferences:** identity, notification cadence, custom areas and privacy controls.

### Design Tokens

- Primary action: violet `#5B00F0`.
- Positive/system-ready: mint `#10C58F`.
- Background: pastel lavender to pale blue.
- Panels: solid high-contrast white or dark-surface containers, no frosted blur dependency.
- Motion: small purposeful transitions only; avoid decorative animation that makes workflows feel slower.

## Behaviour Architecture

The app should create return behaviour through usefulness:

- **Trigger:** daily brief, Life Inbox count, upcoming commitment, useful nudge.
- **Action:** one-tap capture, complete task, schedule, remember, ask Coach.
- **Reward:** a useful insight, clearer day, visible progress, cleaner inbox.
- **Investment:** preferences, custom areas, captured knowledge, decisions, repeated routines.

Do not name this model in the UI. Use plain user value language.

## Technical Architecture Priorities

### Data Reliability

- Apply database migrations as part of release readiness, not manually after UI deploys.
- Keep new tables RLS-enabled with user-scoped policies.
- Use metadata JSONB for extensibility, but promote fields to columns when used for filtering or ordering.

### Frontend Reliability

- Keep heavy or browser-sensitive components dynamic with `ssr:false`.
- Keep API reads guarded with `Array.isArray` and null-safe defaults.
- Avoid local feature-specific shells; shared layout owns navigation and theme.

### AI Context

- Coach context should include recent entries, open tasks, planner agenda, goals, Life Inbox, second brain items, decisions and user preferences.
- Health and sensitive finance stay isolated from cloud AI paths.
- Every AI response that creates action should offer a structured next step.

## Near-Term Build Order

1. **Migration release safety:** add a reliable, tracked migration workflow for Supabase.
2. **Life Inbox decision UI:** build explicit `do/schedule/remember/snooze/archive` controls.
3. **Coach action composer:** let Coach create linked tasks, planner events and knowledge items from one response.
4. **Second brain pages:** add knowledge graph, decisions, saved notes and learning queue views.
5. **Integration setup:** add Google email/calendar connection screens and sync health.
6. **Domain customization:** apply custom labels, active/hidden state and nudge wording across domain pages and dashboards.
7. **Mobile polish:** validate core flows at 390px, 768px and desktop widths.

## Release Rule

Every release should update:

- `CHANGELOG.md`
- In-app `frontend/lib/releaseLog.ts`
- Relevant tests or smoke checks
- Database migration status when schema changes are involved
