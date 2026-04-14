-- Sprint 8: Health data tables
-- Tier 3 — ALL health data stays local (Ollama), never sent to cloud AI models

CREATE TABLE IF NOT EXISTS medical_appointments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    appointment_type TEXT NOT NULL DEFAULT 'gp' CHECK (appointment_type IN ('gp','specialist','dental','optical','therapy','physio','other')),
    scheduled_at    TIMESTAMPTZ NOT NULL,
    location        TEXT,
    provider_name   TEXT,
    notes           TEXT,
    status          TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled','missed')),
    reminder_sent   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS medications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    dosage          TEXT,
    frequency       TEXT NOT NULL DEFAULT 'daily',
    times_of_day    TEXT[] DEFAULT ARRAY['morning'],
    start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date        DATE,
    prescriber      TEXT,
    notes           TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS medication_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    medication_id   UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    taken_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    was_taken       BOOLEAN NOT NULL DEFAULT TRUE,
    notes           TEXT
);

CREATE TABLE IF NOT EXISTS health_screenings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    screening_type  TEXT NOT NULL,   -- 'blood_pressure', 'cholesterol', 'bowel_cancer', etc.
    recommended_age_from INT,
    recommended_age_to   INT,
    frequency_months     INT,
    last_done_date  DATE,
    next_due_date   DATE,
    nhs_programme   BOOLEAN NOT NULL DEFAULT FALSE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vaccinations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vaccine_name    TEXT NOT NULL,
    date_given      DATE NOT NULL,
    next_due_date   DATE,
    batch_number    TEXT,
    provider        TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_user_date ON medical_appointments(user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_medications_user_active ON medications(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_medication_logs_user ON medication_logs(user_id, taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenings_user ON health_screenings(user_id, next_due_date);
CREATE INDEX IF NOT EXISTS idx_vaccinations_user ON vaccinations(user_id, date_given DESC);

ALTER TABLE medical_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_data" ON medical_appointments;
DROP POLICY IF EXISTS "users_own_data" ON medications;
DROP POLICY IF EXISTS "users_own_data" ON medication_logs;
DROP POLICY IF EXISTS "users_own_data" ON health_screenings;
DROP POLICY IF EXISTS "users_own_data" ON vaccinations;

CREATE POLICY "users_own_data" ON medical_appointments USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_data" ON medications USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_data" ON medication_logs USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_data" ON health_screenings USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_data" ON vaccinations USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
