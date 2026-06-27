CREATE TABLE IF NOT EXISTS agent_profile (
    id                      VARCHAR(64) PRIMARY KEY,
    user_id                 BIGINT,
    display_name            VARCHAR(128) NOT NULL,
    description             VARCHAR(512),
    system_prompt_template  TEXT NOT NULL,
    tool_allowlist_json     JSONB NOT NULL DEFAULT '[]',
    model_override          VARCHAR(64),
    max_turns               INT NOT NULL DEFAULT 20,
    max_output_tokens       INT,
    skill_ids_json          JSONB NOT NULL DEFAULT '[]',
    is_system               BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_profile_user_id ON agent_profile (user_id);

ALTER TABLE agent_run ADD COLUMN IF NOT EXISTS parent_run_id VARCHAR(64);
ALTER TABLE agent_run ADD COLUMN IF NOT EXISTS profile_id VARCHAR(64);
ALTER TABLE agent_run ADD COLUMN IF NOT EXISTS role_label VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_agent_run_parent_run_id ON agent_run (parent_run_id);

INSERT INTO agent_profile (id, user_id, display_name, description, system_prompt_template, tool_allowlist_json, skill_ids_json, is_system, max_turns)
SELECT 'main-editor', NULL, '主编辑', '主 Agent 默认角色', '你是主编辑，负责统筹小说创作与改写任务。', '[]'::jsonb, '[]'::jsonb, TRUE, 30
WHERE NOT EXISTS (SELECT 1 FROM agent_profile WHERE id = 'main-editor');

INSERT INTO agent_profile (id, user_id, display_name, description, system_prompt_template, tool_allowlist_json, skill_ids_json, is_system, max_turns)
SELECT 'chapter-writer', NULL, '章节写手', '专注章节写作', 'You are a chapter writer sub-agent. Complete only the delegated writing task.',
 '["ReadChapter","WriteChapter","ListChapters","ReadMemory","ListMemory","SearchKnowledge","GetCharacterGraph"]'::jsonb, '[]'::jsonb, TRUE, 20
WHERE NOT EXISTS (SELECT 1 FROM agent_profile WHERE id = 'chapter-writer');

INSERT INTO agent_profile (id, user_id, display_name, description, system_prompt_template, tool_allowlist_json, skill_ids_json, is_system, max_turns)
SELECT 'continuity-reviewer', NULL, '连续性审校', '审校设定与 continuity', 'You are a continuity reviewer. Report PASS, WARN, or FAIL with specific issues.',
 '["ReadChapter","ListChapters","SearchKnowledge","GetCharacterGraph","NarrativeReview"]'::jsonb, '[]'::jsonb, TRUE, 12
WHERE NOT EXISTS (SELECT 1 FROM agent_profile WHERE id = 'continuity-reviewer');

INSERT INTO agent_profile (id, user_id, display_name, description, system_prompt_template, tool_allowlist_json, skill_ids_json, is_system, max_turns)
SELECT 'style-editor', NULL, '文风润色', '润色文风', 'You are a style editor. Improve prose without changing plot facts.',
 '["ReadChapter","EditChapter","ListChapters"]'::jsonb, '[]'::jsonb, TRUE, 15
WHERE NOT EXISTS (SELECT 1 FROM agent_profile WHERE id = 'style-editor');
