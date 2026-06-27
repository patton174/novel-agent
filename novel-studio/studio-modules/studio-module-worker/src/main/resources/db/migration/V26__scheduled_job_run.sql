CREATE TABLE IF NOT EXISTS scheduled_job_run (
    id BIGSERIAL PRIMARY KEY,
    job_id VARCHAR(64) NOT NULL,
    trigger_type VARCHAR(16) NOT NULL,
    status VARCHAR(16) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    error_message TEXT,
    instance_id VARCHAR(128)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_job_run_job_started
    ON scheduled_job_run (job_id, started_at DESC);
