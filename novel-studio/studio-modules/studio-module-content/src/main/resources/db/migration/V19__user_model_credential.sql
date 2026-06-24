-- BYOK API 连接：一个 key 可配置多个模型
CREATE TABLE IF NOT EXISTS user_model_credential (
    id              VARCHAR(36) PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    label           VARCHAR(120) NOT NULL,
    provider        VARCHAR(32) NOT NULL,
    protocol        VARCHAR(16) NOT NULL,
    base_url        VARCHAR(512) NOT NULL,
    api_key_enc     TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_model_cred_user ON user_model_credential (user_id);

ALTER TABLE user_model ADD COLUMN IF NOT EXISTS credential_id VARCHAR(36);
CREATE INDEX IF NOT EXISTS idx_user_model_credential ON user_model (credential_id);
