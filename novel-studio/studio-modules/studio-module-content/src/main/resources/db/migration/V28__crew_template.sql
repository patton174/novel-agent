CREATE TABLE IF NOT EXISTS crew_template (
    id              VARCHAR(64) PRIMARY KEY,
    user_id         BIGINT,
    display_name    VARCHAR(128) NOT NULL,
    description     TEXT,
    stages_json     JSONB NOT NULL,
    is_system       BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crew_run (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_template_id    VARCHAR(64) NOT NULL,
    session_id          VARCHAR(64) NOT NULL,
    root_run_id         VARCHAR(64) NOT NULL,
    user_id             BIGINT NOT NULL,
    current_stage_key   VARCHAR(64),
    stage_outputs_json  JSONB NOT NULL DEFAULT '{}',
    status              VARCHAR(16) NOT NULL DEFAULT 'running',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crew_run_session ON crew_run (session_id);

-- T76.1: three-act-novel — planner → writer → continuity reviewer
INSERT INTO crew_template (id, user_id, display_name, description, stages_json, is_system)
SELECT 'three-act-novel', NULL,
       '三幕式长篇',
       '经典三阶段：主编辑制定计划 → 章节写手起草 → 连续性审校 PASS/WARN/FAIL。',
       '[
  {
    "key": "plan",
    "profileId": "main-editor",
    "promptTemplate": "根据用户需求制定本章写作计划：大纲要点、角色弧线、伏笔与章末悬念。输出结构化计划摘要。",
    "outputSchema": "PlanResult",
    "gate": "always",
    "onFail": "continue"
  },
  {
    "key": "write",
    "profileId": "chapter-writer",
    "promptTemplate": "依据上一阶段计划撰写章节正文。计划摘要：{{plan.summary}}",
    "outputSchema": "none",
    "gate": "on_plan_success",
    "onFail": "continue"
  },
  {
    "key": "review",
    "profileId": "continuity-reviewer",
    "promptTemplate": "审校刚完成的章节：检查人设、时间线、伏笔与计划一致性，给出 PASS/WARN/FAIL 及修改建议。",
    "outputSchema": "custom",
    "gate": "on_write_success",
    "onFail": "abort_with_report"
  }
]'::jsonb,
       TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM crew_template
    WHERE id = 'three-act-novel' AND is_system = TRUE AND deleted_at IS NULL
);

-- T76.2: fanqie-short — hook open → fast body → hook check (style-editor + fanqie-chapter-hook)
INSERT INTO crew_template (id, user_id, display_name, description, stages_json, is_system)
SELECT 'fanqie-short', NULL,
       '番茄短篇',
       '快节奏短篇：强钩子开篇 → 高密度主体 → 章末钩子润色（含 fanqie-chapter-hook Skill）。',
       '[
  {
    "key": "hook_open",
    "profileId": "chapter-writer",
    "promptTemplate": "为番茄风格短篇撰写强钩子开篇：前三段必须抓住读者，明确冲突与情绪基调。",
    "outputSchema": "none",
    "gate": "always",
    "onFail": "continue"
  },
  {
    "key": "fast_body",
    "profileId": "chapter-writer",
    "promptTemplate": "接续开篇快速推进情节，保持短句节奏与高信息密度，完成本章主体。",
    "outputSchema": "none",
    "gate": "on_write_success",
    "onFail": "continue"
  },
  {
    "key": "hook_check",
    "profileId": "style-editor",
    "promptTemplate": "检查章末钩子强度，必要时润色结尾以引导读者继续阅读。",
    "outputSchema": "none",
    "gate": "on_write_success",
    "skillIds": ["fanqie-chapter-hook"],
    "onFail": "continue"
  }
]'::jsonb,
       TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM crew_template
    WHERE id = 'fanqie-short' AND is_system = TRUE AND deleted_at IS NULL
);

-- T76.3: mystery-serial — clue sheet → chapter → continuity review
INSERT INTO crew_template (id, user_id, display_name, description, stages_json, is_system)
SELECT 'mystery-serial', NULL,
       '悬疑连载',
       '连载悬疑：线索表规划 → 章节撰写 → 连续性审校，保持伏笔与线索一致性。',
       '[
  {
    "key": "clue_sheet",
    "profileId": "main-editor",
    "promptTemplate": "为本章更新线索表：列出已知线索、红鲱鱼、待揭示谜团与角色知情状态，输出结构化摘要。",
    "outputSchema": "PlanResult",
    "gate": "always",
    "onFail": "continue"
  },
  {
    "key": "chapter",
    "profileId": "chapter-writer",
    "promptTemplate": "依据线索表撰写本章正文，埋设或推进谜团，保持叙事张力。线索摘要：{{clue_sheet.summary}}",
    "outputSchema": "none",
    "gate": "on_plan_success",
    "onFail": "continue"
  },
  {
    "key": "continuity_review",
    "profileId": "continuity-reviewer",
    "promptTemplate": "审校本章与既有线索表、人设及时间线的一致性，给出 PASS/WARN/FAIL 及矛盾点说明。",
    "outputSchema": "custom",
    "gate": "on_write_success",
    "onFail": "abort_with_report"
  }
]'::jsonb,
       TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM crew_template
    WHERE id = 'mystery-serial' AND is_system = TRUE AND deleted_at IS NULL
);
