-- 008_song_permissions_authenticated.sql
-- RLS policy updates only — no table changes, no data loss.
-- Prerequisites: 006_folder_ownership.sql applied.
--
-- Authorization model:
--   folders  → owner-only UPDATE/DELETE (unchanged from 006)
--   songs    → any authenticated user may INSERT/UPDATE/DELETE
--   votes    → authenticated users manage own votes (reaffirmed from 002)
--   reads    → public SELECT unchanged

-- ---------------------------------------------------------------------------
-- songs: any authenticated user can manage songs in any folder
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Folder owners insert songs" ON songs;
DROP POLICY IF EXISTS "Folder owners update songs" ON songs;
DROP POLICY IF EXISTS "Folder owners delete songs" ON songs;

CREATE POLICY "Authenticated users insert songs"
  ON songs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users update songs"
  ON songs FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users delete songs"
  ON songs FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- folders: owner-only write (unchanged — listed for rollback reference)
-- Policies "Folder owners update folders" and "Folder owners delete folders"
-- from 006 remain active. No changes applied here.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- votes: authenticated users manage own votes (reaffirm 002 policies)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users insert own votes" ON votes;
DROP POLICY IF EXISTS "Authenticated users update own votes" ON votes;
DROP POLICY IF EXISTS "Authenticated users delete own votes" ON votes;

CREATE POLICY "Authenticated users insert own votes"
  ON votes FOR INSERT
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users update own votes"
  ON votes FOR UPDATE
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users delete own votes"
  ON votes FOR DELETE
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Rollback (restore folder-owner song policies from 006):
--
--   DROP POLICY IF EXISTS "Authenticated users insert songs" ON songs;
--   DROP POLICY IF EXISTS "Authenticated users update songs" ON songs;
--   DROP POLICY IF EXISTS "Authenticated users delete songs" ON songs;
--
--   CREATE POLICY "Folder owners insert songs" ON songs FOR INSERT
--     WITH CHECK (folder_id IN (SELECT id FROM folders WHERE owner_id = auth.uid()));
--   CREATE POLICY "Folder owners update songs" ON songs FOR UPDATE
--     USING (folder_id IN (SELECT id FROM folders WHERE owner_id = auth.uid()))
--     WITH CHECK (folder_id IN (SELECT id FROM folders WHERE owner_id = auth.uid()));
--   CREATE POLICY "Folder owners delete songs" ON songs FOR DELETE
--     USING (folder_id IN (SELECT id FROM folders WHERE owner_id = auth.uid()));
-- ---------------------------------------------------------------------------
