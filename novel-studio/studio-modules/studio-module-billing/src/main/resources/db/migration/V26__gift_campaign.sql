CREATE TABLE IF NOT EXISTS gift_campaign (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(128) NOT NULL,
    gift_type       VARCHAR(32) NOT NULL,
    status          VARCHAR(16) NOT NULL DEFAULT 'active',
    expires_at      TIMESTAMPTZ,
    config_json     JSONB NOT NULL DEFAULT '{}',
    code_count      INT NOT NULL DEFAULT 0,
    redeemed_count  INT NOT NULL DEFAULT 0,
    created_by      BIGINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gift_campaign_status ON gift_campaign(status);

CREATE TABLE IF NOT EXISTS gift_redemption (
    id               BIGSERIAL PRIMARY KEY,
    campaign_id      BIGINT NOT NULL REFERENCES gift_campaign(id),
    code             VARCHAR(64) NOT NULL UNIQUE,
    user_id          BIGINT,
    status           VARCHAR(16) NOT NULL DEFAULT 'available',
    fulfillment_json JSONB,
    redeemed_at      TIMESTAMPTZ,
    fulfilled_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gift_redemption_campaign ON gift_redemption(campaign_id);
CREATE INDEX IF NOT EXISTS idx_gift_redemption_user ON gift_redemption(user_id);
CREATE INDEX IF NOT EXISTS idx_gift_redemption_status ON gift_redemption(status);
