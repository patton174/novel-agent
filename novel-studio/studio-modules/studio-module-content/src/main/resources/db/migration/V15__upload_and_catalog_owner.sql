-- uploaded_file: 通用文件上传元数据
CREATE TABLE IF NOT EXISTS uploaded_file (
    id               VARCHAR(36) PRIMARY KEY,
    owner_id         BIGINT,
    owner_type       VARCHAR(16) NOT NULL,
    original_name    VARCHAR(255) NOT NULL,
    storage_key      VARCHAR(512) NOT NULL,
    mime_type        VARCHAR(128),
    size_bytes       BIGINT NOT NULL,
    format           VARCHAR(16) NOT NULL,
    status           VARCHAR(16) NOT NULL,
    parse_error      TEXT,
    catalog_novel_id VARCHAR(36),
    created_at       TIMESTAMPTZ NOT NULL,
    updated_at       TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_uploaded_file_owner ON uploaded_file (owner_id, owner_type);
CREATE INDEX IF NOT EXISTS idx_uploaded_file_status ON uploaded_file (status);

-- crawl_catalog_novel: 加 owner/source/uploader_file_id（支持上传入库与 owner 隔离）
ALTER TABLE crawl_catalog_novel ADD COLUMN IF NOT EXISTS owner_id BIGINT;
ALTER TABLE crawl_catalog_novel ADD COLUMN IF NOT EXISTS source VARCHAR(16) NOT NULL DEFAULT 'crawl';
ALTER TABLE crawl_catalog_novel ADD COLUMN IF NOT EXISTS uploader_file_id VARCHAR(36);
CREATE INDEX IF NOT EXISTS idx_catalog_novel_owner ON crawl_catalog_novel (owner_id, source);
CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_novel_uploader_file
    ON crawl_catalog_novel (uploader_file_id) WHERE uploader_file_id IS NOT NULL;

-- plan_feature: 加 limit_value（null=布尔特性/无限；数值=限额）
ALTER TABLE plan_feature ADD COLUMN IF NOT EXISTS limit_value INT;

-- user_quota_override: 加 library_upload_bonus
ALTER TABLE user_quota_override ADD COLUMN IF NOT EXISTS library_upload_bonus INT;

-- user_library_collection: 我的书库收藏关系表（user × 公共/上传书库条目）
CREATE TABLE IF NOT EXISTS user_library_collection (
    user_id          BIGINT NOT NULL,
    catalog_novel_id VARCHAR(36) NOT NULL,
    collected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, catalog_novel_id)
);
CREATE INDEX IF NOT EXISTS idx_user_library_collection_user ON user_library_collection (user_id);

-- seed library_upload_limit（plan_feature）
INSERT INTO plan_feature (plan_id, feature_key, enabled, limit_value)
SELECT p.id, 'library_upload_limit', TRUE, v.lim
FROM product_plan p
JOIN (VALUES ('hobby', 5), ('pro', 50)) AS v(code, lim) ON p.code = v.code
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- enterprise: 无限（limit_value NULL）
INSERT INTO plan_feature (plan_id, feature_key, enabled, limit_value)
SELECT p.id, 'library_upload_limit', TRUE, NULL
FROM product_plan p WHERE p.code = 'enterprise'
ON CONFLICT (plan_id, feature_key) DO NOTHING;
