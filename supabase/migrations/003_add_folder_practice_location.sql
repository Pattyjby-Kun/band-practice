-- Phase 1: Add rehearsal location columns to folders (ALTER ONLY)
-- Safe for existing production data. Does not modify songs table.

ALTER TABLE folders
  ADD COLUMN IF NOT EXISTS practice_location_name text;

ALTER TABLE folders
  ADD COLUMN IF NOT EXISTS practice_location_url text;
