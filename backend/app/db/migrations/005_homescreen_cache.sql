-- Home screen cache — pre-computed daily panels
CREATE TABLE IF NOT EXISTS homescreen_cache (
    user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    today       JSONB NOT NULL DEFAULT '{}'::jsonb,
    this_week   JSONB NOT NULL DEFAULT '{}'::jsonb,
    this_month  JSONB NOT NULL DEFAULT '{}'::jsonb,
    this_year   JSONB NOT NULL DEFAULT '{}'::jsonb,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    stale_after  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '6 hours')
);

ALTER TABLE homescreen_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_data" ON homescreen_cache
    FOR ALL USING (auth.uid() = user_id);
