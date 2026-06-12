-- 011_folder_band_id.sql
-- Phase 2: Link folders to bands. ALTER ONLY — preserves existing data.
-- Prerequisites: 009_bands.sql, 010_band_roles.sql applied.

-- ---------------------------------------------------------------------------
-- 1. Add band_id column to folders
-- ---------------------------------------------------------------------------
ALTER TABLE folders
  ADD COLUMN IF NOT EXISTS band_id uuid REFERENCES bands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS folders_band_id_idx ON folders (band_id);

-- ---------------------------------------------------------------------------
-- 2. Data migration: assign existing folders to the creator's first band
--    "First band" = earliest bands.created_at among the creator's memberships
-- ---------------------------------------------------------------------------
UPDATE folders AS f
SET band_id = sub.band_id
FROM (
  SELECT DISTINCT ON (f2.id)
    f2.id AS folder_id,
    b.id AS band_id
  FROM folders AS f2
  INNER JOIN band_members AS bm ON bm.user_id = f2.owner_id
  INNER JOIN bands AS b ON b.id = bm.band_id
  WHERE f2.band_id IS NULL
    AND f2.owner_id IS NOT NULL
  ORDER BY f2.id, b.created_at ASC
) AS sub
WHERE f.id = sub.folder_id
  AND f.band_id IS NULL;

-- Folders with NULL owner_id or owners with no band remain band_id NULL (manual follow-up).

-- ---------------------------------------------------------------------------
-- 3. RLS: scope folder reads/creates to band membership
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read folders" ON folders;

CREATE POLICY "Band members read folders"
  ON folders FOR SELECT
  USING (
    (band_id IS NOT NULL AND public.is_band_member(band_id))
    OR (band_id IS NULL AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated users create own folders" ON folders;

CREATE POLICY "Band members create folders"
  ON folders FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND owner_id = auth.uid()
    AND band_id IS NOT NULL
    AND public.is_band_member(band_id)
  );

-- Folder UPDATE/DELETE policies from 006 (owner-only) remain unchanged.

-- ---------------------------------------------------------------------------
-- Rollback notes (manual):
--   DROP POLICY "Band members read folders" / "Band members create folders";
--   Recreate public read + original insert policies;
--   ALTER TABLE folders DROP COLUMN IF EXISTS band_id;
-- ---------------------------------------------------------------------------
