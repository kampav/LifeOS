-- Sprint 8: Assets, document vault, legacy vault

CREATE TABLE IF NOT EXISTS assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    asset_type      TEXT NOT NULL CHECK (asset_type IN (
        'property', 'vehicle', 'investment', 'pension', 'savings',
        'business', 'insurance', 'crypto', 'other'
    )),
    current_value   NUMERIC(14,2),
    purchase_value  NUMERIC(14,2),
    purchase_date   DATE,
    currency        TEXT NOT NULL DEFAULT 'GBP',
    liability       NUMERIC(14,2) DEFAULT 0,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_vault (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    document_type   TEXT NOT NULL CHECK (document_type IN (
        'passport', 'driving_licence', 'birth_certificate', 'will',
        'power_of_attorney', 'insurance_policy', 'property_deed',
        'tax_document', 'medical_record', 'other'
    )),
    gcs_path        TEXT,
    file_size_bytes INTEGER,
    content_type    TEXT,
    expiry_date     DATE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS legacy_vault (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_type      TEXT NOT NULL CHECK (entry_type IN ('message', 'instruction', 'account_info', 'contact', 'wish')),
    title           TEXT NOT NULL,
    content         TEXT,
    recipient_name  TEXT,
    recipient_email TEXT,
    is_encrypted    BOOLEAN NOT NULL DEFAULT TRUE,
    release_on      TEXT CHECK (release_on IN ('death', 'incapacity', 'specific_date', 'manual')),
    release_date    DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assets_user ON assets(user_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_document_vault_user ON document_vault(user_id, document_type);
CREATE INDEX IF NOT EXISTS idx_legacy_vault_user ON legacy_vault(user_id);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE legacy_vault ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_data" ON assets;
DROP POLICY IF EXISTS "users_own_data" ON document_vault;
DROP POLICY IF EXISTS "users_own_data" ON legacy_vault;

CREATE POLICY "users_own_data" ON assets USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_data" ON document_vault USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_data" ON legacy_vault USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
