-- MCP API tokens — users create tokens to connect Claude Desktop or other MCP clients
CREATE TABLE IF NOT EXISTS mcp_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    scopes      TEXT[] NOT NULL DEFAULT ARRAY['read','write'],
    token_hash  TEXT NOT NULL,
    last_used_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mcp_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_data" ON mcp_tokens
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mcp_tokens_user ON mcp_tokens(user_id);
