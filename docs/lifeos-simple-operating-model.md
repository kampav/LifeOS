# LifeOS Simple Operating Model

## Product Promise

LifeOS is not a collection of life-management modules. It is one private inbox for life, with one simple decision flow.

## The Flow

1. Capture: everything comes into one place.
2. Decide: choose one of five outcomes.
3. Act: LifeOS routes it to the right system quietly.

## Five Decisions

- Do: create a task.
- Schedule: create a calendar/planner item.
- Remember: save it to the second brain.
- Snooze: hide it until the right time.
- Archive: keep it out of the way.

## What This Means For Features

- Email should not be a mailbox inside LifeOS. Important messages become life inbox items.
- Calendar should not be another calendar view. Events become protected time and context for the day.
- Second brain should not be a note-taking app. It is the memory destination for things worth keeping.
- AI should not ask users to navigate modules. It should ask: "What should happen with this?"

## Current Build

The backend now supports:

- `/api/v1/life/flow`: describes the simple LifeOS process.
- `/api/v1/life/inbox`: returns the unified inbox.
- `/api/v1/life/capture`: captures anything into the inbox.
- `/api/v1/life/items/{id}/decide`: turns an inbox item into a task, calendar item, second-brain note, snooze or archive.
- `/api/v1/life/integrations/google/connect`: produces the Google OAuth URL when env vars are configured.
- `/api/v1/life/integrations/email/ingest`: normalises Gmail/Outlook messages into LifeOS.
- `/api/v1/life/integrations/calendar/ingest`: normalises Google/Outlook calendar events into planner and LifeOS context.

## Design Principle

The UI should eventually show one question:

What needs your attention?

Everything else should be background intelligence.
