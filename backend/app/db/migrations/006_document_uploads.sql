-- Sprint 7: Document uploads table
-- Stores metadata for uploaded documents; content extracted but not persisted until confirmed

CREATE TABLE IF NOT EXISTS document_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    gcs_path TEXT,                      -- GCS object path; deleted after 24h lifecycle rule
    status TEXT NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'ready', 'confirmed', 'skipped', 'error')),
    sensitivity_tier INTEGER NOT NULL DEFAULT 2
        CHECK (sensitivity_tier IN (1, 2, 3)),
    extracted_summary TEXT,             -- Short summary for confirmation card
    extracted_domains TEXT[],           -- Detected domain tags
    action_items JSONB DEFAULT '[]',    -- [{title, domain, item_type}]
    confirmed_ids TEXT[] DEFAULT '{}',  -- Subset of action_items user accepted
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX idx_document_uploads_user_id ON document_uploads(user_id);
CREATE INDEX idx_document_uploads_status ON document_uploads(user_id, status);
CREATE INDEX idx_document_uploads_expires ON document_uploads(expires_at)
    WHERE status NOT IN ('confirmed', 'skipped');

ALTER TABLE document_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_data" ON document_uploads
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
