-- Planner items — calendar events and scheduled tasks
CREATE TABLE IF NOT EXISTS planner_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    domain          TEXT,
    item_type       TEXT NOT NULL DEFAULT 'task' CHECK (item_type IN ('task','event','reminder','habit','goal_milestone')),
    start_at        TIMESTAMPTZ NOT NULL,
    end_at          TIMESTAMPTZ,
    all_day         BOOLEAN NOT NULL DEFAULT FALSE,
    is_non_movable  BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_rule TEXT,  -- iCal RRULE
    google_event_id TEXT,
    task_id         UUID REFERENCES tasks(id) ON DELETE SET NULL,
    goal_id         UUID REFERENCES goals(id) ON DELETE SET NULL,
    priority        TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
    completed       BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE planner_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_data" ON planner_items
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_planner_user_start ON planner_items(user_id, start_at);
CREATE INDEX IF NOT EXISTS idx_planner_user_domain ON planner_items(user_id, domain);
