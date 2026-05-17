-- LifeOS vNext: simple one-stop inbox and external connectivity.

CREATE TABLE IF NOT EXISTS life_items (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_type                 TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN (
        'manual','email','calendar','document','ai','second_brain'
    )),
    source_provider             TEXT NOT NULL DEFAULT 'lifeos' CHECK (source_provider IN (
        'lifeos','gmail','google_calendar','outlook','outlook_calendar','manual'
    )),
    external_id                 TEXT,
    title                       TEXT NOT NULL,
    summary                     TEXT,
    content_preview             TEXT,
    item_kind                   TEXT NOT NULL DEFAULT 'capture' CHECK (item_kind IN (
        'capture','action','event','knowledge','reminder','info'
    )),
    domain                      TEXT,
    priority                    TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
    status                      TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN (
        'inbox','decided','scheduled','done','archived','snoozed'
    )),
    decision                    TEXT CHECK (decision IN ('do','schedule','remember','archive','snooze')),
    due_at                      TIMESTAMPTZ,
    snoozed_until               TIMESTAMPTZ,
    linked_task_id              UUID REFERENCES tasks(id) ON DELETE SET NULL,
    linked_planner_item_id      UUID REFERENCES planner_items(id) ON DELETE SET NULL,
    linked_knowledge_item_id    UUID REFERENCES knowledge_items(id) ON DELETE SET NULL,
    metadata                    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, source_provider, external_id)
);

ALTER TABLE planner_items ADD COLUMN IF NOT EXISTS source_provider TEXT;
ALTER TABLE planner_items ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE planner_items ADD COLUMN IF NOT EXISTS external_url TEXT;
ALTER TABLE planner_items ADD COLUMN IF NOT EXISTS raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'planner_items_user_source_external_key'
    ) THEN
        ALTER TABLE planner_items
            ADD CONSTRAINT planner_items_user_source_external_key
            UNIQUE (user_id, source_provider, external_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_life_items_user_status ON life_items(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_life_items_user_source ON life_items(user_id, source_provider, external_id);
CREATE INDEX IF NOT EXISTS idx_life_items_user_due ON life_items(user_id, due_at) WHERE due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_planner_external_source ON planner_items(user_id, source_provider, external_id);

ALTER TABLE life_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_data" ON life_items;
CREATE POLICY "users_own_data" ON life_items
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION update_life_items_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS life_items_updated_at ON life_items;
CREATE TRIGGER life_items_updated_at BEFORE UPDATE ON life_items FOR EACH ROW EXECUTE FUNCTION update_life_items_updated_at();
