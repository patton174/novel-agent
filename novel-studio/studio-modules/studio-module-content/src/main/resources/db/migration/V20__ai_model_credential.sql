-- 平台公共模型 API 连接：一个 key 可配置多个 ai_model
CREATE TABLE IF NOT EXISTS ai_model_credential (
    id              VARCHAR(36) PRIMARY KEY,
    model_type      VARCHAR(16) NOT NULL,
    label           VARCHAR(120) NOT NULL,
    provider        VARCHAR(32) NOT NULL,
    protocol        VARCHAR(16) NOT NULL,
    base_url        VARCHAR(512) NOT NULL,
    api_key_enc     TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_model_cred_type ON ai_model_credential (model_type);

ALTER TABLE ai_model ADD COLUMN IF NOT EXISTS credential_id VARCHAR(36);
CREATE INDEX IF NOT EXISTS idx_ai_model_credential ON ai_model (credential_id);

ALTER TABLE ai_model ALTER COLUMN api_key_enc DROP NOT NULL;
