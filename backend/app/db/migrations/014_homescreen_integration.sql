-- Integrated homescreen cache fields for planner + Kanban + AI operating context.
ALTER TABLE homescreen_cache
    ADD COLUMN IF NOT EXISTS agenda JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS kanban_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS next_best_action JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS integration_summary JSONB NOT NULL DEFAULT '{}'::jsonb;
