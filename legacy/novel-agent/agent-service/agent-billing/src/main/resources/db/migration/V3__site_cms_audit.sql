CREATE TABLE IF NOT EXISTS site_content (
    content_key VARCHAR(64) PRIMARY KEY,
    title       VARCHAR(256) NOT NULL,
    body_md     TEXT NOT NULL,
    locale      VARCHAR(8) NOT NULL DEFAULT 'zh-CN',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by  BIGINT
);

CREATE TABLE IF NOT EXISTS audit_log (
    id          BIGSERIAL PRIMARY KEY,
    actor_id    BIGINT NOT NULL,
    action      VARCHAR(64) NOT NULL,
    target_type VARCHAR(32),
    target_id   VARCHAR(64),
    before_json JSONB,
    after_json  JSONB,
    ip          VARCHAR(45),
    trace_id    VARCHAR(64),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

INSERT INTO site_content (content_key, title, body_md)
VALUES
    ('privacy', '隐私政策', '## 隐私政策

我们重视您的隐私。本文说明 Novel Agent 如何收集、使用与保护您的个人信息。

### 1. 收集的信息
- 账号信息（用户名、邮箱）
- 使用数据（Token 用量、Agent 运行记录）

### 2. 信息用途
用于提供写作服务、计量计费与产品改进。

### 3. 联系我们
如有疑问，请通过「联系我们」页面与我们取得联系。'),
    ('terms', '用户协议', '## 用户协议

使用 Novel Agent 即表示您同意以下条款。

### 1. 服务说明
本平台提供 AI 辅助小说创作工具，用量按套餐配额计量。

### 2. 用户责任
您应合法使用生成内容，不得用于违法或侵权用途。

### 3. 变更
我们保留更新本协议的权利，重大变更将通过站内公告通知。'),
    ('contact', '联系我们', '## 联系我们

- **邮箱**：support@novel-agent.cn
- **反馈**：登录后在仪表盘「账户设置」中提交问题

我们会在 1–3 个工作日内回复。'),
    ('announcement', '系统公告', '')
ON CONFLICT (content_key) DO NOTHING;
