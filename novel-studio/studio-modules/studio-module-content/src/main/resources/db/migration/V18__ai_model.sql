-- ai_model: 全局模型目录
CREATE TABLE IF NOT EXISTS ai_model (
    id              VARCHAR(36) PRIMARY KEY,
    code            VARCHAR(64) NOT NULL UNIQUE,
    display_name    VARCHAR(120) NOT NULL,
    model_type      VARCHAR(16) NOT NULL,
    provider        VARCHAR(32) NOT NULL,
    protocol        VARCHAR(16) NOT NULL,
    model_name      VARCHAR(120) NOT NULL,
    base_url        VARCHAR(512) NOT NULL,
    api_key_enc     TEXT NOT NULL,
    max_tokens      INTEGER,
    temperature     DOUBLE PRECISION,
    input_price_per_1k_micros  BIGINT,
    output_price_per_1k_micros BIGINT,
    price_multiplier DECIMAL(6,3) NOT NULL DEFAULT 1.000,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_model_type_active ON ai_model (model_type, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_model_default_per_type ON ai_model (model_type) WHERE is_default = TRUE;

-- ai_model_plan_access: 模型-套餐多对多
CREATE TABLE IF NOT EXISTS ai_model_plan_access (
    model_id  VARCHAR(36) NOT NULL,
    plan_code VARCHAR(32) NOT NULL,
    PRIMARY KEY (model_id, plan_code)
);

-- user_model: 用户默认模型 + BYOK
CREATE TABLE IF NOT EXISTS user_model (
    id              VARCHAR(36) PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    model_type      VARCHAR(16) NOT NULL DEFAULT 'llm',
    public_model_id VARCHAR(36),
    label           VARCHAR(120),
    provider        VARCHAR(32),
    protocol        VARCHAR(16),
    model_name      VARCHAR(120),
    base_url        VARCHAR(512),
    api_key_enc     TEXT,
    is_byok         BOOLEAN NOT NULL DEFAULT FALSE,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_model_user ON user_model (user_id, model_type);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_model_default ON user_model (user_id, model_type) WHERE is_default = TRUE;
