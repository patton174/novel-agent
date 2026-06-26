-- site_content 复合主键 (content_key, locale)，支持多语言 CMS

ALTER TABLE site_content DROP CONSTRAINT IF EXISTS site_content_pkey;

UPDATE site_content SET locale = 'zh-CN' WHERE locale IS NULL OR locale = '';

ALTER TABLE site_content ALTER COLUMN locale SET DEFAULT 'zh-CN';

ALTER TABLE site_content ADD PRIMARY KEY (content_key, locale);

CREATE INDEX IF NOT EXISTS idx_site_content_key ON site_content(content_key);
