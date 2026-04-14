-- Important dates — birthdays, anniversaries, deadlines
CREATE TABLE IF NOT EXISTS important_dates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    date        DATE NOT NULL,
    category    TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('birthday','anniversary','deadline','appointment','holiday','other')),
    domain      TEXT,
    recurring   BOOLEAN NOT NULL DEFAULT TRUE,  -- recur annually
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE important_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_data" ON important_dates
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_important_dates_user_date ON important_dates(user_id, date);
