-- Cumulative daily writing activity (deleting chapters does not roll back past totals)

CREATE TABLE IF NOT EXISTS user_writing_activity_daily (
    user_id       BIGINT NOT NULL,
    activity_date DATE NOT NULL,
    words_added   BIGINT NOT NULL DEFAULT 0,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_user_writing_activity_user_date
    ON user_writing_activity_daily (user_id, activity_date);

-- One-time backfill from current chapter snapshots
INSERT INTO user_writing_activity_daily (user_id, activity_date, words_added, updated_at)
SELECT n.user_id,
       DATE(c.updated_at AT TIME ZONE 'UTC') AS activity_date,
       SUM(COALESCE(c.word_count, 0)) AS words_added,
       MAX(c.updated_at) AS updated_at
FROM chapter c
JOIN novel n ON c.novel_id = n.id
WHERE COALESCE(c.word_count, 0) > 0
GROUP BY n.user_id, DATE(c.updated_at AT TIME ZONE 'UTC')
ON CONFLICT (user_id, activity_date) DO NOTHING;
