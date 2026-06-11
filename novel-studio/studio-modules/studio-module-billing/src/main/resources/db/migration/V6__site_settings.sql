CREATE TABLE IF NOT EXISTS site_settings (
    setting_key VARCHAR(64) PRIMARY KEY,
    value_json  JSONB NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by  BIGINT
);

INSERT INTO site_settings (setting_key, value_json)
VALUES
    ('registration.enabled', 'true'::jsonb),
    ('registration.require_email_verify', 'true'::jsonb),
    ('agent.default_model', '"deepseek-chat"'::jsonb),
    ('agent.max_tokens_per_run', '4096'::jsonb),
    ('crawl.max_concurrent_jobs', '2'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
