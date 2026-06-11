-- Content service baseline (shared DB: novel_agent)

CREATE TABLE IF NOT EXISTS novel (
    id                   VARCHAR(36) PRIMARY KEY,
    user_id              BIGINT NOT NULL,
    title                VARCHAR(200) NOT NULL,
    description          TEXT,
    genre                VARCHAR(64),
    style                VARCHAR(64),
    target_chapter_words INTEGER,
    cover_url            VARCHAR(1024),
    created_at           TIMESTAMPTZ NOT NULL,
    updated_at           TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_novel_user_id ON novel (user_id);

CREATE TABLE IF NOT EXISTS volume (
    id          VARCHAR(36) PRIMARY KEY,
    novel_id    VARCHAR(36) NOT NULL,
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    sort_order  INTEGER NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_volume_novel_id ON volume (novel_id);

CREATE TABLE IF NOT EXISTS chapter (
    id          VARCHAR(36) PRIMARY KEY,
    novel_id    VARCHAR(36) NOT NULL,
    volume_id   VARCHAR(36),
    title       VARCHAR(200) NOT NULL,
    content     TEXT,
    summary     TEXT,
    sort_order  INTEGER NOT NULL,
    word_count  INTEGER,
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chapter_novel_id ON chapter (novel_id);
CREATE INDEX IF NOT EXISTS idx_chapter_volume_id ON chapter (volume_id);

CREATE TABLE IF NOT EXISTS chapter_version (
    id         VARCHAR(36) PRIMARY KEY,
    chapter_id VARCHAR(36) NOT NULL,
    novel_id   VARCHAR(36) NOT NULL,
    title      VARCHAR(200) NOT NULL,
    content    TEXT,
    word_count INTEGER,
    source     VARCHAR(16),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chapter_version_chapter_id ON chapter_version (chapter_id);

CREATE TABLE IF NOT EXISTS story_memory (
    user_id     BIGINT NOT NULL,
    session_id  VARCHAR(64) NOT NULL,
    memory_json TEXT NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, session_id)
);

CREATE TABLE IF NOT EXISTS novel_story_memory (
    user_id     BIGINT NOT NULL,
    novel_id    VARCHAR(64) NOT NULL,
    memory_json TEXT NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, novel_id)
);

CREATE TABLE IF NOT EXISTS agent_session (
    id         VARCHAR(64) PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    novel_id   VARCHAR(64),
    title      VARCHAR(256),
    status     VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_session_user_id ON agent_session (user_id);

CREATE TABLE IF NOT EXISTS agent_message (
    id         VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    run_id     VARCHAR(64),
    role       VARCHAR(16) NOT NULL,
    content    TEXT,
    status     VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_message_session_id ON agent_message (session_id);

CREATE TABLE IF NOT EXISTS agent_run (
    id                   VARCHAR(64) PRIMARY KEY,
    session_id           VARCHAR(64) NOT NULL,
    user_id              BIGINT NOT NULL,
    user_message_id      VARCHAR(64) NOT NULL,
    assistant_message_id VARCHAR(64),
    status               VARCHAR(32) NOT NULL,
    mode                 VARCHAR(32),
    error_message        TEXT,
    worker_id            VARCHAR(64),
    lease_expires_at     TIMESTAMPTZ,
    started_at           TIMESTAMPTZ,
    completed_at         TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL,
    updated_at           TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_run_session_id ON agent_run (session_id);
CREATE INDEX IF NOT EXISTS idx_agent_run_user_id ON agent_run (user_id);

CREATE TABLE IF NOT EXISTS agent_event (
    id         VARCHAR(64) PRIMARY KEY,
    run_id     VARCHAR(64) NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    sequence   INTEGER NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    source     VARCHAR(32) NOT NULL,
    payload    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_event_run_id ON agent_event (run_id);

CREATE TABLE IF NOT EXISTS agent_run_command (
    id           VARCHAR(64) PRIMARY KEY,
    run_id       VARCHAR(64) NOT NULL,
    command_type VARCHAR(32) NOT NULL,
    payload      TEXT NOT NULL,
    status       VARCHAR(32) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_run_command_run_id ON agent_run_command (run_id);

CREATE TABLE IF NOT EXISTS agent_run_checkpoint (
    run_id         VARCHAR(64) PRIMARY KEY,
    step_index     INTEGER NOT NULL,
    last_action    VARCHAR(32),
    context_patch  TEXT NOT NULL,
    transcript_ref VARCHAR(128),
    version        INTEGER NOT NULL,
    updated_at     TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS crawl_site (
    id          VARCHAR(36) PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    base_url    VARCHAR(512),
    config_json TEXT,
    enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    remark      VARCHAR(500),
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS crawl_job (
    id                 VARCHAR(36) PRIMARY KEY,
    source_url         VARCHAR(1024) NOT NULL,
    site_id            VARCHAR(36),
    title              VARCHAR(200),
    status             VARCHAR(32) NOT NULL,
    target_user_id     BIGINT,
    created_by_admin_id BIGINT,
    catalog_novel_id   VARCHAR(36),
    chapters_total     INTEGER,
    chapters_done      INTEGER,
    config_json        TEXT,
    error_message      TEXT,
    started_at         TIMESTAMPTZ,
    completed_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL,
    updated_at         TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_crawl_job_status ON crawl_job (status);

CREATE TABLE IF NOT EXISTS crawl_catalog_novel (
    id            VARCHAR(36) PRIMARY KEY,
    job_id        VARCHAR(36),
    title         VARCHAR(200) NOT NULL,
    author        VARCHAR(120),
    description   TEXT,
    source_url    VARCHAR(1024),
    cover_url     VARCHAR(1024),
    chapter_count INTEGER,
    created_at    TIMESTAMPTZ NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS crawl_catalog_chapter (
    id               VARCHAR(36) PRIMARY KEY,
    catalog_novel_id VARCHAR(36) NOT NULL,
    title            VARCHAR(200) NOT NULL,
    content          TEXT,
    sort_order       INTEGER NOT NULL,
    source_url       VARCHAR(1024),
    word_count       INTEGER,
    created_at       TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_crawl_catalog_chapter_novel_id ON crawl_catalog_chapter (catalog_novel_id);
