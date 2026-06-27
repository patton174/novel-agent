CREATE TABLE IF NOT EXISTS user_notification (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    category        VARCHAR(32) NOT NULL,
    title_key       VARCHAR(128),
    body_key        VARCHAR(128),
    title_text      TEXT,
    body_text       TEXT,
    payload_json    JSONB,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notification_user_created
    ON user_notification (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_user_notification_unread
    ON user_notification (user_id) WHERE read_at IS NULL;
