-- Sprint 7: Integrations, sync logs, inbox items

CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft', 'notion', 'todoist', 'apple')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'error')),
    scopes TEXT[] DEFAULT '{}',
    access_token_enc TEXT,              -- AES-256 encrypted at rest
    refresh_token_enc TEXT,
    token_expires_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, provider)
);

CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    sync_type TEXT NOT NULL,            -- 'calendar', 'email_triage', etc.
    status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'error')),
    items_synced INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS inbox_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('gmail', 'outlook', 'manual')),
    external_id TEXT,                   -- Gmail message ID / Outlook message ID
    subject TEXT,
    snippet TEXT,
    category TEXT CHECK (category IN ('action', 'info', 'waiting', 'archive', 'unknown')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    snoozed_until TIMESTAMPTZ,
    linked_task_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_integrations_user_id ON integrations(user_id);
CREATE INDEX idx_sync_logs_user_id ON sync_logs(user_id, started_at DESC);
CREATE INDEX idx_inbox_items_user_id ON inbox_items(user_id, is_read, created_at DESC);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_data" ON integrations
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_data" ON sync_logs
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_data" ON inbox_items
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
