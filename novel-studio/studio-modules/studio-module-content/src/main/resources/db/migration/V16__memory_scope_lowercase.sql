-- Align legacy scope values with normalizeScope() (case-insensitive storage).
UPDATE memory_node
SET scope = LOWER(scope)
WHERE scope <> LOWER(scope);
