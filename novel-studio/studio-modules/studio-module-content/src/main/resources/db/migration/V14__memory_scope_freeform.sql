-- Scope is user-defined: outermost root node title (not a fixed enum).

ALTER TABLE memory_node
    ALTER COLUMN scope TYPE VARCHAR(128);
