CREATE TABLE IF NOT EXISTS referral_code (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    code        VARCHAR(32) NOT NULL,
    status      VARCHAR(16) NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_referral_code_code UNIQUE (code),
    CONSTRAINT uq_referral_code_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_code_user ON referral_code(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_code_status ON referral_code(status);

CREATE TABLE IF NOT EXISTS referral_attribution (
    id                  BIGSERIAL PRIMARY KEY,
    referrer_user_id    BIGINT NOT NULL,
    referred_user_id    BIGINT NOT NULL,
    first_touch_at      TIMESTAMPTZ NOT NULL,
    registered_at       TIMESTAMPTZ NOT NULL,
    first_paid_order_id BIGINT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_referral_attribution_referred UNIQUE (referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_attribution_referrer ON referral_attribution(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_attribution_first_paid
    ON referral_attribution(referrer_user_id)
    WHERE first_paid_order_id IS NOT NULL;
