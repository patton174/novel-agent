-- crawl_job: scheduling fields
ALTER TABLE crawl_job ADD COLUMN IF NOT EXISTS priority        SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE crawl_job ADD COLUMN IF NOT EXISTS max_retries     SMALLINT NOT NULL DEFAULT 3;
ALTER TABLE crawl_job ADD COLUMN IF NOT EXISTS retry_count     SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE crawl_job ADD COLUMN IF NOT EXISTS schedule_cron   VARCHAR(64);
ALTER TABLE crawl_job ADD COLUMN IF NOT EXISTS next_run_at     TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_crawl_job_dispatch ON crawl_job (status, priority, created_at)
    WHERE status IN ('PENDING','QUEUED');
CREATE INDEX IF NOT EXISTS idx_crawl_job_schedule ON crawl_job (next_run_at)
    WHERE schedule_cron IS NOT NULL AND status = 'PENDING';

-- site_settings seed
INSERT INTO site_settings (setting_key, value_json)
VALUES ('crawl.default_max_retries', '3'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- crawl_orchestrator_state: 编排器状态（单行，DB 持久化）
CREATE TABLE IF NOT EXISTS crawl_orchestrator_state (
    id          SMALLINT PRIMARY KEY DEFAULT 1,
    goal        TEXT,
    enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    poll_sec    INTEGER NOT NULL DEFAULT 30,
    updated_at  TIMESTAMPTZ NOT NULL,
    CONSTRAINT singleton CHECK (id = 1)
);
INSERT INTO crawl_orchestrator_state (id, goal, enabled, poll_sec, updated_at)
VALUES (1, NULL, FALSE, 30, NOW()) ON CONFLICT (id) DO NOTHING;
