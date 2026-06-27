-- kg_entity: 实体（按 novel_id 隔离）
CREATE TABLE IF NOT EXISTS kg_entity (
    id          VARCHAR(36) PRIMARY KEY,
    novel_id    VARCHAR(36) NOT NULL,
    name        VARCHAR(120) NOT NULL,
    type        VARCHAR(32) NOT NULL,
    aliases     TEXT,
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL,
    UNIQUE (novel_id, name)
);
CREATE INDEX IF NOT EXISTS idx_kg_entity_novel ON kg_entity (novel_id);
CREATE INDEX IF NOT EXISTS idx_kg_entity_novel_type ON kg_entity (novel_id, type);

-- kg_relation: 关系
CREATE TABLE IF NOT EXISTS kg_relation (
    id          VARCHAR(36) PRIMARY KEY,
    novel_id    VARCHAR(36) NOT NULL,
    src_name    VARCHAR(120) NOT NULL,
    rel         VARCHAR(64) NOT NULL,
    dst_name    VARCHAR(120) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL,
    UNIQUE (novel_id, src_name, rel, dst_name)
);
CREATE INDEX IF NOT EXISTS idx_kg_relation_novel ON kg_relation (novel_id);
CREATE INDEX IF NOT EXISTS idx_kg_relation_src ON kg_relation (novel_id, src_name);

-- kg_ingest_error: 抽取失败记录
CREATE TABLE IF NOT EXISTS kg_ingest_error (
    id          BIGSERIAL PRIMARY KEY,
    novel_id    VARCHAR(36) NOT NULL,
    chapter_id  VARCHAR(36),
    reason      TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kg_ingest_error_novel ON kg_ingest_error (novel_id);
