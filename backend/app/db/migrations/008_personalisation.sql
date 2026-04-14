-- User personalisation — coach style, domain weights, accent colour
CREATE TABLE IF NOT EXISTS user_personalisation (
    user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    coach_tone      INT NOT NULL DEFAULT 2 CHECK (coach_tone BETWEEN 1 AND 5),
    detail_level    INT NOT NULL DEFAULT 3 CHECK (detail_level BETWEEN 1 AND 5),
    domain_weights  JSONB NOT NULL DEFAULT '{
        "health":5,"finance":5,"family":5,"social":5,"career":5,
        "growth":5,"property":5,"holiday":5,"community":5,"education":5
    }'::jsonb,
    alert_cadence   TEXT NOT NULL DEFAULT 'normal' CHECK (alert_cadence IN ('minimal','normal','frequent')),
    accent_colour   TEXT NOT NULL DEFAULT '#6366F1',
    layout_density  TEXT NOT NULL DEFAULT 'comfortable' CHECK (layout_density IN ('compact','comfortable','spacious')),
    font_size       TEXT NOT NULL DEFAULT 'medium' CHECK (font_size IN ('small','medium','large')),
    undo_stack      JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_personalisation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_data" ON user_personalisation
    FOR ALL USING (auth.uid() = user_id);

-- Auto-create personalisation row when a new user signs up
CREATE OR REPLACE FUNCTION create_default_personalisation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.user_personalisation (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_personalisation ON auth.users;
CREATE TRIGGER on_auth_user_created_personalisation
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_personalisation();

-- updated_at auto-update
CREATE OR REPLACE FUNCTION update_personalisation_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS personalisation_updated_at ON user_personalisation;
CREATE TRIGGER personalisation_updated_at
    BEFORE UPDATE ON user_personalisation
    FOR EACH ROW EXECUTE FUNCTION update_personalisation_updated_at();
