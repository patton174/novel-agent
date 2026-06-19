CREATE TABLE IF NOT EXISTS product_plan (
    id                  BIGSERIAL PRIMARY KEY,
    code                VARCHAR(32) NOT NULL UNIQUE,
    name                VARCHAR(64) NOT NULL,
    description         TEXT,
    price_cents         INT,
    currency            VARCHAR(8) NOT NULL DEFAULT 'CNY',
    billing_interval    VARCHAR(16) NOT NULL DEFAULT 'month',
    monthly_token_quota BIGINT,
    monthly_run_quota   INT,
    rate_limit_rpm      INT NOT NULL DEFAULT 60,
    overage_policy      VARCHAR(32) NOT NULL DEFAULT 'block',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured         BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order          INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_feature (
    id           BIGSERIAL PRIMARY KEY,
    plan_id      BIGINT NOT NULL REFERENCES product_plan(id) ON DELETE CASCADE,
    feature_key  VARCHAR(64) NOT NULL,
    enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(plan_id, feature_key)
);

CREATE TABLE IF NOT EXISTS user_subscription (
    id                   BIGSERIAL PRIMARY KEY,
    user_id              BIGINT NOT NULL UNIQUE,
    plan_id              BIGINT NOT NULL REFERENCES product_plan(id),
    status               VARCHAR(16) NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end   TIMESTAMPTZ NOT NULL,
    external_sub_id      VARCHAR(128),
    canceled_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_quota_override (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT NOT NULL,
    token_bonus    BIGINT NOT NULL DEFAULT 0,
    run_bonus      INT NOT NULL DEFAULT 0,
    rate_limit_rpm INT,
    reason         TEXT,
    expires_at     TIMESTAMPTZ,
    created_by     BIGINT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_quota_override_user ON user_quota_override(user_id);

CREATE TABLE IF NOT EXISTS usage_event (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL,
    run_id              VARCHAR(64),
    session_id          VARCHAR(64),
    trace_id            VARCHAR(64),
    event_type          VARCHAR(32) NOT NULL,
    model               VARCHAR(64),
    input_tokens        INT NOT NULL DEFAULT 0,
    output_tokens       INT NOT NULL DEFAULT 0,
    cache_read_tokens   INT NOT NULL DEFAULT 0,
    cache_write_tokens  INT NOT NULL DEFAULT 0,
    unit_cost_micros    BIGINT NOT NULL DEFAULT 0,
    total_cost_micros   BIGINT NOT NULL DEFAULT 0,
    metadata_json       JSONB,
    idempotency_key     VARCHAR(128),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_usage_event_user_created ON usage_event(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_event_run ON usage_event(run_id);
CREATE INDEX IF NOT EXISTS idx_usage_event_trace ON usage_event(trace_id);

CREATE TABLE IF NOT EXISTS usage_period_summary (
    user_id         BIGINT NOT NULL,
    period_yyyy_mm  CHAR(7) NOT NULL,
    tokens_used     BIGINT NOT NULL DEFAULT 0,
    runs_used       INT NOT NULL DEFAULT 0,
    cost_micros     BIGINT NOT NULL DEFAULT 0,
    quota_tokens    BIGINT,
    quota_runs      INT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, period_yyyy_mm)
);
