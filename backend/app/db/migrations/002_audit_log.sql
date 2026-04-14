-- Migration 002: Audit log table
-- Immutable audit trail for all write operations (PRD §6.4 security requirement)

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,          -- 'create' | 'update' | 'delete' | 'read_sensitive'
  resource_type TEXT NOT NULL,   -- 'entry' | 'goal' | 'habit' | 'conversation' etc.
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  changes JSONB,                 -- {new: ..., old: ...} for sensitive fields
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (service key can write, users can only read their own)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_audit" ON audit_log FOR SELECT USING (auth.uid() = user_id);

-- Immutable: prevent deletes and updates
CREATE OR REPLACE RULE no_audit_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;
CREATE OR REPLACE RULE no_audit_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_user_created ON audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log (resource_type, resource_id);
