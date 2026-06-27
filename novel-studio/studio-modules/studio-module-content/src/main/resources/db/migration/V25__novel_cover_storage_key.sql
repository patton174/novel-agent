ALTER TABLE novel
    ADD COLUMN IF NOT EXISTS cover_storage_key VARCHAR(512);

COMMENT ON COLUMN novel.cover_storage_key IS 'AI 封面落盘存储 key（covers/{userId}/{novelId}/...）';
