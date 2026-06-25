CREATE TABLE IF NOT EXISTS payment_order (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    plan_code       VARCHAR(32) NOT NULL,
    idr_order_id    VARCHAR(64) NOT NULL,
    status          VARCHAR(16) NOT NULL DEFAULT 'NEW',
    pay_method      VARCHAR(32),
    contact_info    VARCHAR(120) NOT NULL,
    amount_cents    INT,
    currency        VARCHAR(8),
    pay_url         TEXT,
    callback_json   JSONB,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payment_order_idr UNIQUE (idr_order_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_order_user_created ON payment_order(user_id, created_at DESC);

ALTER TABLE product_plan
    ADD COLUMN IF NOT EXISTS idr_project_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS idr_sku_id VARCHAR(64);
