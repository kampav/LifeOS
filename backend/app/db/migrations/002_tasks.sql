-- Tasks table — Kanban items with status workflow
CREATE TABLE IF NOT EXISTS tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    domain          TEXT,
    status          TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','waiting','done','archived')),
    priority        TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
    position        INT NOT NULL DEFAULT 0,
    due_date        DATE,
    goal_id         UUID REFERENCES goals(id) ON DELETE SET NULL,
    tags            TEXT[] DEFAULT '{}',
    is_non_movable  BOOLEAN NOT NULL DEFAULT FALSE,  -- true = fixed events (meetings, appointments)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_data" ON tasks
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_domain ON tasks(user_id, domain);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(user_id, due_date) WHERE due_date IS NOT NULL;

-- updated_at auto-update
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_tasks_updated_at();
