-- LifeOS vNext: second brain, learning, decisions and life review foundations.

CREATE TABLE IF NOT EXISTS knowledge_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    content             TEXT,
    item_type           TEXT NOT NULL DEFAULT 'note' CHECK (item_type IN (
        'note','idea','article','book_note','quote','decision_input',
        'meeting_note','memory','resource','playbook'
    )),
    domain              TEXT,
    para_area           TEXT NOT NULL DEFAULT 'resources' CHECK (para_area IN ('projects','areas','resources','archive')),
    status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','synthesised','archived')),
    source_url          TEXT,
    source_name         TEXT,
    tags                TEXT[] DEFAULT '{}',
    related_goal_id     UUID REFERENCES goals(id) ON DELETE SET NULL,
    related_task_id     UUID REFERENCES tasks(id) ON DELETE SET NULL,
    importance          INT NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
    confidence          INT NOT NULL DEFAULT 3 CHECK (confidence BETWEEN 1 AND 5),
    captured_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_reviewed_at    TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_item_id    UUID NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    to_item_id      UUID NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    relation_type   TEXT NOT NULL DEFAULT 'related' CHECK (relation_type IN (
        'related','supports','contradicts','extends','applies_to','source_for'
    )),
    strength        INT NOT NULL DEFAULT 3 CHECK (strength BETWEEN 1 AND 5),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (from_item_id, to_item_id, relation_type)
);

CREATE TABLE IF NOT EXISTS learning_resources (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    resource_type       TEXT NOT NULL DEFAULT 'course' CHECK (resource_type IN (
        'book','course','article','video','podcast','paper','person','project','other'
    )),
    provider            TEXT,
    domain              TEXT,
    status              TEXT NOT NULL DEFAULT 'to_consume' CHECK (status IN (
        'to_consume','consuming','completed','paused','archived'
    )),
    url                 TEXT,
    notes               TEXT,
    progress_percent    INT NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    tags                TEXT[] DEFAULT '{}',
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    next_review_at      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_id         UUID REFERENCES learning_resources(id) ON DELETE SET NULL,
    title               TEXT NOT NULL,
    learned_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    duration_minutes    INT,
    summary             TEXT,
    takeaways           TEXT[] DEFAULT '{}',
    actions             TEXT[] DEFAULT '{}',
    confidence          INT NOT NULL DEFAULT 3 CHECK (confidence BETWEEN 1 AND 5),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS decision_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    domain              TEXT,
    decision_type       TEXT NOT NULL DEFAULT 'personal' CHECK (decision_type IN (
        'personal','family','financial','career','health','property','learning','other'
    )),
    status              TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','decided','reversed','archived')),
    context             TEXT,
    options             JSONB NOT NULL DEFAULT '[]'::jsonb,
    criteria            JSONB NOT NULL DEFAULT '{}'::jsonb,
    decision            TEXT,
    rationale           TEXT,
    reversible          BOOLEAN NOT NULL DEFAULT TRUE,
    decided_at          TIMESTAMPTZ,
    review_at           TIMESTAMPTZ,
    related_goal_id     UUID REFERENCES goals(id) ON DELETE SET NULL,
    related_task_id     UUID REFERENCES tasks(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS life_reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    review_type     TEXT NOT NULL DEFAULT 'weekly' CHECK (review_type IN ('daily','weekly','monthly','quarterly','annual')),
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','completed','archived')),
    wins            TEXT[] DEFAULT '{}',
    challenges      TEXT[] DEFAULT '{}',
    lessons         TEXT[] DEFAULT '{}',
    next_actions    TEXT[] DEFAULT '{}',
    scores          JSONB NOT NULL DEFAULT '{}'::jsonb,
    narrative       TEXT,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_items_user_domain ON knowledge_items(user_id, domain);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_user_para ON knowledge_items(user_id, para_area, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_captured ON knowledge_items(user_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_links_user ON knowledge_links(user_id, from_item_id);
CREATE INDEX IF NOT EXISTS idx_learning_resources_user ON learning_resources(user_id, status, domain);
CREATE INDEX IF NOT EXISTS idx_learning_resources_review ON learning_resources(user_id, next_review_at) WHERE next_review_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_learning_sessions_user ON learning_sessions(user_id, learned_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_records_user ON decision_records(user_id, status, domain);
CREATE INDEX IF NOT EXISTS idx_life_reviews_user ON life_reviews(user_id, review_type, period_start DESC);

ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_data" ON knowledge_items;
DROP POLICY IF EXISTS "users_own_data" ON knowledge_links;
DROP POLICY IF EXISTS "users_own_data" ON learning_resources;
DROP POLICY IF EXISTS "users_own_data" ON learning_sessions;
DROP POLICY IF EXISTS "users_own_data" ON decision_records;
DROP POLICY IF EXISTS "users_own_data" ON life_reviews;

CREATE POLICY "users_own_data" ON knowledge_items USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_data" ON knowledge_links
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM knowledge_items
            WHERE knowledge_items.id = knowledge_links.from_item_id
              AND knowledge_items.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM knowledge_items
            WHERE knowledge_items.id = knowledge_links.to_item_id
              AND knowledge_items.user_id = auth.uid()
        )
    );
CREATE POLICY "users_own_data" ON learning_resources USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_data" ON learning_sessions USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_data" ON decision_records USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_data" ON life_reviews USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION update_second_brain_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS knowledge_items_updated_at ON knowledge_items;
CREATE TRIGGER knowledge_items_updated_at BEFORE UPDATE ON knowledge_items FOR EACH ROW EXECUTE FUNCTION update_second_brain_updated_at();

DROP TRIGGER IF EXISTS learning_resources_updated_at ON learning_resources;
CREATE TRIGGER learning_resources_updated_at BEFORE UPDATE ON learning_resources FOR EACH ROW EXECUTE FUNCTION update_second_brain_updated_at();

DROP TRIGGER IF EXISTS decision_records_updated_at ON decision_records;
CREATE TRIGGER decision_records_updated_at BEFORE UPDATE ON decision_records FOR EACH ROW EXECUTE FUNCTION update_second_brain_updated_at();

DROP TRIGGER IF EXISTS life_reviews_updated_at ON life_reviews;
CREATE TRIGGER life_reviews_updated_at BEFORE UPDATE ON life_reviews FOR EACH ROW EXECUTE FUNCTION update_second_brain_updated_at();
