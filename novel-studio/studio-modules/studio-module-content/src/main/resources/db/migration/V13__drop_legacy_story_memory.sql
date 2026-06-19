-- Legacy flat story-memory (scope/key/memory_json) replaced by memory_node (V12).
-- No data migration — old rows are abandoned.

DROP TABLE IF EXISTS story_memory;
DROP TABLE IF EXISTS novel_story_memory;
