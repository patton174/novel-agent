CREATE TABLE IF NOT EXISTS agent_skill (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         BIGINT,
    name            VARCHAR(64) NOT NULL,
    version         INT NOT NULL DEFAULT 1,
    description     VARCHAR(512),
    content         TEXT NOT NULL,
    tools_json      JSONB NOT NULL DEFAULT '[]',
    locale          VARCHAR(8) NOT NULL DEFAULT 'zh',
    is_system       BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_skill_user_name
    ON agent_skill (COALESCE(user_id, 0), name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_agent_skill_user_id ON agent_skill (user_id);

-- Bundled system skills (placeholder content; Part 5 replaces bodies)
INSERT INTO agent_skill (user_id, name, version, description, content, tools_json, locale, is_system)
SELECT NULL, 'fanqie-chapter-hook', 1,
       '番茄短篇章末钩子写法',
       '# 章末钩子 Skill (placeholder)

在章节结尾制造悬念或情绪高点，引导读者继续阅读下一章。',
       '["ReadChapter", "WriteChapter", "SearchKnowledge"]'::jsonb,
       'zh', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM agent_skill
    WHERE name = 'fanqie-chapter-hook' AND is_system = TRUE AND deleted_at IS NULL
);

INSERT INTO agent_skill (user_id, name, version, description, content, tools_json, locale, is_system)
SELECT NULL, 'sweet-romance-beat', 1,
       '甜宠情节节拍',
       '# 甜宠节拍 Skill (placeholder)

规划高糖互动与情绪递进，保持人设一致与节奏轻快。',
       '["ReadChapter", "WriteChapter", "ReadMemory"]'::jsonb,
       'zh', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM agent_skill
    WHERE name = 'sweet-romance-beat' AND is_system = TRUE AND deleted_at IS NULL
);

INSERT INTO agent_skill (user_id, name, version, description, content, tools_json, locale, is_system)
SELECT NULL, 'mystery-cold-open', 1,
       '悬疑冷开场',
       '# 悬疑冷开场 Skill (placeholder)

用反常细节或冲突开场，快速建立谜团与紧张感。',
       '["ReadChapter", "WriteChapter", "SearchKnowledge"]'::jsonb,
       'zh', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM agent_skill
    WHERE name = 'mystery-cold-open' AND is_system = TRUE AND deleted_at IS NULL
);
