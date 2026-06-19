-- Tree-structured story memory nodes (adjacency list per novel).
-- Authoritative storage for new writes; legacy novel_story_memory.memory_json is NOT migrated.

CREATE TABLE IF NOT EXISTS memory_node (
    user_id     BIGINT       NOT NULL,
    novel_id    VARCHAR(64)  NOT NULL,
    id          VARCHAR(64)  NOT NULL,
    scope       VARCHAR(32)  NOT NULL,
    parent_id   VARCHAR(64)  NULL,
    sort_order  INT          NOT NULL DEFAULT 0,
    title       VARCHAR(512) NOT NULL,
    node_kind   VARCHAR(16)  NOT NULL DEFAULT 'both',
    content     TEXT         NULL,
    style       JSONB        NULL,
    meta        JSONB        NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, novel_id, id)
);

CREATE INDEX IF NOT EXISTS idx_memory_node_scope
    ON memory_node (user_id, novel_id, scope);

CREATE INDEX IF NOT EXISTS idx_memory_node_parent_sort
    ON memory_node (user_id, novel_id, parent_id, sort_order);
