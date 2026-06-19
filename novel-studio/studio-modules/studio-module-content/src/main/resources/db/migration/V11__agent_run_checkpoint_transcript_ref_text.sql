-- transcript_ref may hold long object-store keys; VARCHAR(128) caused checkpoint upsert 500s.
ALTER TABLE agent_run_checkpoint
    ALTER COLUMN transcript_ref TYPE TEXT;
