-- Agent skill version history + per-user pin (official skills snapshot)

CREATE TABLE IF NOT EXISTS agent_skill_revision (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id    UUID NOT NULL REFERENCES agent_skill (id),
    version     INT NOT NULL,
    description VARCHAR(512),
    content     TEXT NOT NULL,
    tools_json  JSONB NOT NULL DEFAULT '[]',
    locale      VARCHAR(8) NOT NULL DEFAULT 'zh',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_agent_skill_revision_skill_version UNIQUE (skill_id, version)
);

CREATE INDEX IF NOT EXISTS idx_agent_skill_revision_skill_id
    ON agent_skill_revision (skill_id);

CREATE TABLE IF NOT EXISTS user_skill_ref (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         BIGINT NOT NULL,
    skill_id        UUID NOT NULL REFERENCES agent_skill (id),
    pinned_version  INT NOT NULL,
    auto_update     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_skill_ref_user_skill_active
    ON user_skill_ref (user_id, skill_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_skill_ref_user_id
    ON user_skill_ref (user_id)
    WHERE deleted_at IS NULL;
