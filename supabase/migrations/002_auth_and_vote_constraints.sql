-- 002_auth_and_vote_constraints.sql
-- ALTER ONLY — safe for existing Supabase database with data.
-- Run in Supabase SQL Editor. Do NOT recreate tables.

-- ---------------------------------------------------------------------------
-- members: link band member profiles to Supabase Auth users
-- ---------------------------------------------------------------------------
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS instrument text;

CREATE UNIQUE INDEX IF NOT EXISTS members_user_id_unique
  ON members (user_id)
  WHERE user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- votes: enforce one vote per member per song (preserves null member_id rows)
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS votes_song_id_member_id_unique
  ON votes (song_id, member_id)
  WHERE member_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'votes_vote_type_check'
      AND conrelid = 'public.votes'::regclass
  ) THEN
    ALTER TABLE votes
      ADD CONSTRAINT votes_vote_type_check
      CHECK (vote_type IN ('like', 'dislike'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- RLS: restrict vote/member writes to authenticated owners
-- (read policies remain public; legacy anonymous vote rows are preserved)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public insert votes" ON votes;
DROP POLICY IF EXISTS "Allow public update votes" ON votes;
DROP POLICY IF EXISTS "Allow public delete votes" ON votes;

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

DROP POLICY IF EXISTS "Allow public insert members" ON members;
DROP POLICY IF EXISTS "Allow public update members" ON members;

CREATE POLICY "Authenticated users insert own member profile"
  ON members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users update own member profile"
  ON members FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
