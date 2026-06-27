ALTER TABLE crawl_catalog_novel ADD COLUMN IF NOT EXISTS index_status VARCHAR(16) NOT NULL DEFAULT 'pending';
ALTER TABLE crawl_catalog_novel ADD COLUMN IF NOT EXISTS index_namespace VARCHAR(64);
