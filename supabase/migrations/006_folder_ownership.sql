-- 006_folder_ownership.sql
-- ALTER ONLY — safe for existing production data.
-- Adds folder ownership and restricts folder/song writes to owners.

-- ---------------------------------------------------------------------------
-- folders: link each rehearsal folder to its creator
-- ---------------------------------------------------------------------------
ALTER TABLE folders
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS folders_owner_id_idx ON folders (owner_id);

-- ---------------------------------------------------------------------------
-- RLS: folders — public read, owner-only write
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public insert folders" ON folders;
DROP POLICY IF EXISTS "Allow public update folders" ON folders;
DROP POLICY IF EXISTS "Allow public delete folders" ON folders;

CREATE POLICY "Authenticated users create own folders"
  ON folders FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND owner_id = auth.uid()
  );

CREATE POLICY "Folder owners update folders"
  ON folders FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Folder owners delete folders"
  ON folders FOR DELETE
  USING (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RLS: songs — public read, folder-owner write
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public insert songs" ON songs;
DROP POLICY IF EXISTS "Allow public update songs" ON songs;
DROP POLICY IF EXISTS "Allow public delete songs" ON songs;

CREATE POLICY "Folder owners insert songs"
  ON songs FOR INSERT
  WITH CHECK (
    folder_id IN (
      SELECT id FROM folders WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Folder owners update songs"
  ON songs FOR UPDATE
  USING (
    folder_id IN (
      SELECT id FROM folders WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    folder_id IN (
      SELECT id FROM folders WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Folder owners delete songs"
  ON songs FOR DELETE
  USING (
    folder_id IN (
      SELECT id FROM folders WHERE owner_id = auth.uid()
    )
  );
