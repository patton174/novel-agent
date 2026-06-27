-- site_danmaku: optional English translation for public marquee (zh-CN source)
ALTER TABLE site_danmaku
    ADD COLUMN IF NOT EXISTS message_en VARCHAR(120),
    ADD COLUMN IF NOT EXISTS message_en_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_site_danmaku_message_en_pending
    ON site_danmaku (created_at ASC)
    WHERE message_en IS NULL OR TRIM(message_en) = '';
