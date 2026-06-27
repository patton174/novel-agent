CREATE TABLE IF NOT EXISTS scheduled_job_config (
    job_id            VARCHAR(64) PRIMARY KEY,
    enabled           BOOLEAN NOT NULL DEFAULT TRUE,
    schedule_type     VARCHAR(16) NOT NULL DEFAULT 'fixed_delay',
    fixed_delay_ms    BIGINT,
    cron_expression   VARCHAR(128),
    initial_delay_ms  BIGINT,
    updated_by        BIGINT,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
