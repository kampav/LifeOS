-- LifeOS vNext: customizable life areas and nudge preferences.

ALTER TABLE user_personalisation
    ADD COLUMN IF NOT EXISTS domain_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS nudge_preferences JSONB NOT NULL DEFAULT '{
        "enabled": true,
        "quiet_hours": {"start": "21:30", "end": "07:00"},
        "max_per_day": 3,
        "channels": ["in_app"]
    }'::jsonb;

CREATE INDEX IF NOT EXISTS idx_user_personalisation_domain_config
    ON user_personalisation USING GIN (domain_config);

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
        'review_ready','goal_reminder','relationship_check','coach_insight',
        'system','nudge','life_inbox','evening_reflection','medication_reminder'
    )
);
