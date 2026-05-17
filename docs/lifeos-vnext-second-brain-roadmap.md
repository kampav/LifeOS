# LifeOS vNext: Whole-Life Operating System

## Executive Intent

LifeOS should become the trusted place where Pav can run the practical, emotional, financial, learning and relationship layers of life from one adaptive system. The next phase should move the product from "feature dashboard" to "personal operating system": capture everything, clarify what matters, connect it to goals and routines, review progress, and let AI suggest the next best action.

## Research Anchors

- GTD: use Capture, Clarify, Organize, Reflect and Engage as the action-management loop. Source: https://gettingthingsdone.com/what-is-gtd/
- PARA: organize information by actionability across Projects, Areas, Resources and Archives. Source: https://fortelabs.com/blog/para/
- CODE: treat knowledge as a workflow: capture useful inputs, organize them, distill insight, and express output. Source: https://fortelabs.com/blog/the-4-levels-of-personal-knowledge-management/
- OECD Well-being Framework: model life beyond GDP using current well-being, gaps between groups and resources for future well-being. Source: https://www.oecd.org/en/data/tools/well-being-data-monitor.html
- CDC social determinants: health is shaped by education, healthcare, built environment, social/community context and economic stability. Source: https://www.cdc.gov/public-health-gateway/php/about/social-determinants-of-health.html
- NHS mental wellbeing: connect, be active, learn, give and practise mindfulness. Source: https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/five-steps-to-mental-wellbeing/
- Stanford Behavior Design: design for positive behaviour change and help people succeed at what they already want to do. Source: https://behaviordesign.stanford.edu/

## Product Principle

Every interaction should improve the next one. LifeOS should not just store data; it should compound context. A note can become a task, a task can support a goal, a goal can appear in a weekly review, and the review should teach the AI coach what to suggest tomorrow.

## New Capability Set

### 1. Second Brain

Purpose: capture the user's thinking, references, lessons, memories and operating principles.

Data now added:

- `knowledge_items`: notes, ideas, book notes, decision inputs, meeting notes, memories, resources and playbooks.
- `knowledge_links`: graph links between knowledge items using relations such as supports, contradicts, extends and applies_to.

User value:

- Fast capture for "I need to remember this."
- Domain-linked notes for health, finance, family, career, growth and home.
- A knowledge graph that makes the AI coach aware of durable context.

### 2. Learning OS

Purpose: convert courses, books, videos, papers and projects into retained capability.

Data now added:

- `learning_resources`: a learning backlog with status, progress, tags and next review date.
- `learning_sessions`: what was learned, key takeaways, actions and confidence.

User value:

- Turns passive content into active learning.
- Gives the AI coach enough context to ask "what will you apply from this?"
- Supports spaced review and skill progression.

### 3. Decision Journal

Purpose: help Pav make better personal, financial, family, career and property decisions over time.

Data now added:

- `decision_records`: decision context, options, criteria, rationale, reversibility and review date.

User value:

- Improves decision quality through explicit trade-offs.
- Enables future review of what worked, not just what was chosen.
- Gives AI a responsible memory of rationale and constraints.

### 4. Life Reviews

Purpose: create a recurring reflection layer that keeps the whole system honest.

Data now added:

- `life_reviews`: daily, weekly, monthly, quarterly and annual review records with wins, challenges, lessons, next actions and scores.

User value:

- Converts experience into learning.
- Keeps goals, habits, tasks and knowledge connected.
- Creates the retention loop ethically: return because the system helps life feel clearer.

## Next Features To Build

### Release 1: Capture And Connect

- Universal capture endpoint for notes, tasks, expenses, symptoms, ideas, memories and documents.
- AI classifier that maps captures to domain, PARA area, item type and suggested next action.
- "Create from capture" actions: task, planner item, goal, knowledge note, learning resource or decision record.
- Inbox processing queue based on GTD: clarify, delegate, defer, schedule, archive.

### Release 2: Weekly Review Engine

- Guided weekly review generated from tasks, planner, goals, habits, health, finance and knowledge.
- Review output becomes next actions and updated priorities.
- Domain scorecards: health, family, career, finance, home, growth, social, spiritual and admin.
- "What changed this week?" AI summary.

### Release 3: Whole-Life Map

- Life area model aligned to OECD/CDC/NHS: health, relationships, family, career, money, home, learning, community, mental wellbeing and future resilience.
- Dependency map showing which goals, routines, assets, decisions and knowledge items support each area.
- Personal risk register for neglected areas, overdue decisions and accumulating friction.

### Release 4: Proactive Coach

- AI operating context includes tasks, planner, goals, habits, recent knowledge, learning backlog, open decisions and latest reviews.
- Coach recommends one next action, one friction removal and one recovery action each day.
- User feedback loop: helpful/not helpful, why, and what changed.
- Guardrail: optimise for stated goals and wellbeing, not raw engagement.

### Release 5: Family And Household OS

- Household routines: school, meals, bills, maintenance, travel, documents and emergency details.
- Shared family moments and important dates connected to planner and reminders.
- Property and asset lifecycle: warranties, insurance, maintenance, valuation, mortgage, tenancy and documents.
- Privacy controls per data type before multi-user sharing.

### Release 6: Finance And Future Planning

- Net worth timeline, savings goals, pensions, ISAs, mortgage/property planning, insurance and tax reminder workflow.
- Decision templates for property, investments and major purchases.
- Scenario planning with assumptions clearly separated from facts.
- Exportable adviser pack for mortgage/tax/financial advice.

### Release 7: Knowledge To Output

- Turn knowledge clusters into LinkedIn posts, strategy notes, family plans, meal plans, learning plans or work narratives.
- "Pav's principles" library: durable leadership, health, family, money and product principles extracted from reviews and notes.
- Personal playbooks for repeatable workflows.

## Behaviour Design Guardrails

- Trigger: prompts should be tied to user goals, timing and genuine usefulness.
- Action: make the next useful step obvious and low friction.
- Reward: focus on mastery, clarity and relief, not compulsive checking.
- Investment: every capture, review and decision should make future sessions more personalised.
- Ethics: LifeOS should be transparent about why it recommends something and should let the user tune or disable loops.

## Success Metrics

- Capture-to-clarified rate: percentage of raw inputs converted into useful objects.
- Weekly review completion rate.
- Goals with linked tasks, knowledge and review evidence.
- Overdue decision count.
- Learning resources with at least one session and one applied action.
- AI helpfulness rating by domain.
- User-reported clarity score after daily/weekly sessions.
