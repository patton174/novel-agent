CREATE TABLE IF NOT EXISTS invite_code (
    id              BIGINT PRIMARY KEY,
    code            VARCHAR(32) NOT NULL,
    created_by      BIGINT,
    max_uses        INT NOT NULL DEFAULT 1,
    used_count      INT NOT NULL DEFAULT 0,
    expires_at      TIMESTAMPTZ,
    reward_type     VARCHAR(32) NOT NULL DEFAULT 'none',
    reward_payload  JSONB,
    status          VARCHAR(16) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_invite_code_code ON invite_code (code);
CREATE INDEX IF NOT EXISTS idx_invite_code_status ON invite_code (status);

CREATE TABLE IF NOT EXISTS invite_redemption (
    id              BIGINT PRIMARY KEY,
    invite_code_id  BIGINT NOT NULL REFERENCES invite_code (id),
    user_id         BIGINT NOT NULL,
    redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invite_redemption_code ON invite_redemption (invite_code_id);
CREATE INDEX IF NOT EXISTS idx_invite_redemption_user ON invite_redemption (user_id);
