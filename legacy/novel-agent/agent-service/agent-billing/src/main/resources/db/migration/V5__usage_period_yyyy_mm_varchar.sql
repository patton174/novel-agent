-- Hibernate validate expects VARCHAR for String columns; V1 used CHAR(7).
ALTER TABLE usage_period_summary
    ALTER COLUMN period_yyyy_mm TYPE VARCHAR(7) USING period_yyyy_mm::varchar;
