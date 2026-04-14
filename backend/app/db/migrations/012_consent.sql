-- Sprint 8: Consent records — GDPR / UK GDPR compliance

CREATE TABLE IF NOT EXISTS consent_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type    TEXT NOT NULL CHECK (consent_type IN (
        'health_data', 'financial_data', 'ai_processing',
        'marketing', 'analytics', 'third_party_sharing'
    )),
    is_required     BOOLEAN NOT NULL DEFAULT FALSE,
    granted         BOOLEAN NOT NULL DEFAULT FALSE,
    granted_at      TIMESTAMPTZ,
    withdrawn_at    TIMESTAMPTZ,
    ip_address      TEXT,
    user_agent      TEXT,
    version         TEXT NOT NULL DEFAULT '1.0',   -- terms/privacy policy version
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, consent_type)
);

-- Data export requests
CREATE TABLE IF NOT EXISTS data_export_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','ready','downloaded','expired')),
    download_url    TEXT,
    requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ
);

-- Data deletion requests (hard delete within 30 days per PRD §9)
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed')),
    reason          TEXT,
    requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    scheduled_for   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_consent_user ON consent_records(user_id, consent_type);
CREATE INDEX IF NOT EXISTS idx_export_requests_user ON data_export_requests(user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_scheduled ON data_deletion_requests(scheduled_for) WHERE status = 'pending';

ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_data" ON consent_records;
DROP POLICY IF EXISTS "users_own_data" ON data_export_requests;
DROP POLICY IF EXISTS "users_own_data" ON data_deletion_requests;

CREATE POLICY "users_own_data" ON consent_records USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_data" ON data_export_requests USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_data" ON data_deletion_requests USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
