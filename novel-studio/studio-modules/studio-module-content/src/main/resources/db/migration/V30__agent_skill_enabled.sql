-- Per-user enable flag: custom skills on agent_skill, official refs on user_skill_ref

ALTER TABLE agent_skill
    ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE user_skill_ref
    ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE;
