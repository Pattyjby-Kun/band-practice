-- 007_backfill_folder_owners.sql
-- UPDATE ONLY — safe for legacy production data.
-- Does not recreate tables or delete rows.
--
-- Purpose:
--   Legacy folders created before 006 have owner_id = NULL and are read-only.
--   This assigns ownership so the band admin can edit/delete them again.
--
-- Rule:
--   Folders with at least one song → owner_id := auth.uid()
--   Folders with zero songs     → unchanged (owner_id stays NULL)
--
-- Prerequisites:
--   006_folder_ownership.sql must already be applied.
--
-- How to run (auth.uid() must NOT be NULL):
--   1. Preferred: Supabase Dashboard → SQL Editor while signed in as the
--      user who should own all legacy folders with songs.
--   2. If auth.uid() is NULL in SQL Editor, set JWT claims first, then run
--      the UPDATE block below (replace with your user UUID):
--
--        SELECT set_config('request.jwt.claim.sub', '<your-user-uuid>', true);
--        SELECT set_config('request.jwt.claim.role', 'authenticated', true);
--
-- Idempotent: only updates rows where owner_id IS NULL.

DO $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION
      'auth.uid() is NULL — cannot backfill safely. Sign in as the intended owner or set request.jwt.claim.sub before running this migration.';
  END IF;
END $$;

UPDATE folders AS f
SET owner_id = auth.uid()
WHERE f.owner_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM songs AS s
    WHERE s.folder_id = f.id
  );

-- ---------------------------------------------------------------------------
-- Rollback (run manually only if you need to undo this backfill):
--
--   UPDATE folders AS f
--   SET owner_id = NULL
--   WHERE f.owner_id = auth.uid()
--     AND EXISTS (
--       SELECT 1
--       FROM songs AS s
--       WHERE s.folder_id = f.id
--     );
--
-- Rollback assumes the same auth.uid() as the backfill run. Take a snapshot
-- of folders.owner_id before backfill if you need a precise restore.
-- ---------------------------------------------------------------------------
