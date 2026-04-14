-- Sprint 8: Finance tables
-- All sensitive — Tier 2, Ollama-routed AI, never exposed to cloud models

CREATE TABLE IF NOT EXISTS transactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    amount      NUMERIC(12,2) NOT NULL,
    currency    TEXT NOT NULL DEFAULT 'GBP',
    direction   TEXT NOT NULL CHECK (direction IN ('income','expense')),
    category    TEXT NOT NULL DEFAULT 'other',
    subcategory TEXT,
    description TEXT,
    merchant    TEXT,
    account     TEXT,
    source      TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','import','plaid','truelayer')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budgets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month       DATE NOT NULL,           -- first day of month
    category    TEXT NOT NULL,
    amount      NUMERIC(12,2) NOT NULL,
    currency    TEXT NOT NULL DEFAULT 'GBP',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, month, category)
);

CREATE TABLE IF NOT EXISTS net_worth_snapshots (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    assets      NUMERIC(14,2) NOT NULL DEFAULT 0,
    liabilities NUMERIC(14,2) NOT NULL DEFAULT 0,
    net_worth   NUMERIC(14,2) GENERATED ALWAYS AS (assets - liabilities) STORED,
    currency    TEXT NOT NULL DEFAULT 'GBP',
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS tax_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tax_year        TEXT NOT NULL,   -- e.g. '2024-25'
    record_type     TEXT NOT NULL CHECK (record_type IN ('self_assessment','p60','p45','vat','corporation','other')),
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','filed','overdue')),
    deadline        DATE,
    amount_owed     NUMERIC(12,2),
    amount_paid     NUMERIC(12,2),
    notes           TEXT,
    document_id     UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month DESC);
CREATE INDEX IF NOT EXISTS idx_net_worth_user_date ON net_worth_snapshots(user_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_tax_records_user ON tax_records(user_id, tax_year);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE net_worth_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_data" ON transactions;
DROP POLICY IF EXISTS "users_own_data" ON budgets;
DROP POLICY IF EXISTS "users_own_data" ON net_worth_snapshots;
DROP POLICY IF EXISTS "users_own_data" ON tax_records;

CREATE POLICY "users_own_data" ON transactions USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_data" ON budgets USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_data" ON net_worth_snapshots USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_data" ON tax_records USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
