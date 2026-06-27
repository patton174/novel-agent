-- user_balance: 余额（CDK 充值 + overage 赊账欠费）
CREATE TABLE IF NOT EXISTS user_balance (
    user_id         BIGINT PRIMARY KEY,
    balance_micros  BIGINT NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL
);

-- redemption_code: CDK 兑换码
CREATE TABLE IF NOT EXISTS redemption_code (
    id              VARCHAR(36) PRIMARY KEY,
    code            VARCHAR(64) NOT NULL UNIQUE,
    type            VARCHAR(16) NOT NULL,
    value           VARCHAR(120) NOT NULL,
    max_uses        INTEGER NOT NULL DEFAULT 1,
    used_count      INTEGER NOT NULL DEFAULT 0,
    expires_at      TIMESTAMPTZ,
    created_by      BIGINT,
    created_at      TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_redemption_code_code ON redemption_code (code);

-- redemption_record: 兑换记录（防重+审计）
CREATE TABLE IF NOT EXISTS redemption_record (
    id              BIGSERIAL PRIMARY KEY,
    code_id         VARCHAR(36) NOT NULL,
    user_id         BIGINT NOT NULL,
    redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (code_id, user_id)
);

-- upgrade_request: 审批流
CREATE TABLE IF NOT EXISTS upgrade_request (
    id              VARCHAR(36) PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    request_type    VARCHAR(16) NOT NULL,
    target_value    VARCHAR(120) NOT NULL,
    reason          TEXT,
    status          VARCHAR(16) NOT NULL DEFAULT 'pending',
    reviewed_by     BIGINT,
    reviewed_at     TIMESTAMPTZ,
    review_note     TEXT,
    created_at      TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_upgrade_request_status ON upgrade_request (status, created_at);
CREATE INDEX IF NOT EXISTS idx_upgrade_request_user ON upgrade_request (user_id);

-- usage_period_summary: overage 赊账累计
ALTER TABLE usage_period_summary ADD COLUMN IF NOT EXISTS overage_micros BIGINT NOT NULL DEFAULT 0;

-- seed free 计划（修 ensureDefaultSubscription bug）
INSERT INTO product_plan (code, name, description, price_cents, currency, billing_interval,
    monthly_token_quota, monthly_run_quota, rate_limit_rpm, overage_policy, is_active, is_featured, sort_order)
VALUES ('free', '免费', '免费体验套餐', 0, 'CNY', 'month', 1000, 10, 5, 'block', TRUE, FALSE, 0)
ON CONFLICT (code) DO NOTHING;

-- free 计划 feature（基础编辑器）
INSERT INTO plan_feature (plan_id, feature_key, enabled)
SELECT p.id, 'basic_editor', TRUE FROM product_plan p WHERE p.code = 'free'
ON CONFLICT (plan_id, feature_key) DO NOTHING;
