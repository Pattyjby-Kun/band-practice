-- 010_band_roles.sql
-- Phase 1: band_members.role, RLS helpers, membership-scoped read policies.
-- ALTER ONLY — does not recreate tables. Does not touch folders/songs/votes.

-- ---------------------------------------------------------------------------
-- 1. Add role column to band_members
-- ---------------------------------------------------------------------------
ALTER TABLE band_members
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'band_members_role_check'
      AND conrelid = 'public.band_members'::regclass
  ) THEN
    ALTER TABLE band_members
      ADD CONSTRAINT band_members_role_check
      CHECK (role IN ('owner', 'admin', 'member'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Backfill existing memberships
-- ---------------------------------------------------------------------------
UPDATE band_members AS bm
SET role = 'owner'
FROM bands AS b
WHERE bm.band_id = b.id
  AND b.owner_id IS NOT NULL
  AND bm.user_id = b.owner_id
  AND bm.role <> 'owner';

UPDATE band_members AS bm
SET role = 'member'
WHERE bm.role IS NULL
   OR bm.role NOT IN ('owner', 'admin', 'member');

-- Ensure band owners have a membership row when bands.owner_id is set
INSERT INTO band_members (band_id, user_id, role)
SELECT b.id, b.owner_id, 'owner'
FROM bands AS b
WHERE b.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM band_members AS bm
    WHERE bm.band_id = b.id
      AND bm.user_id = b.owner_id
  );

-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS band_members_band_id_role_idx
  ON band_members (band_id, role);

-- ---------------------------------------------------------------------------
-- 4. RLS helper functions (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_band_member(band_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.band_members
    WHERE band_id = band_uuid
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.band_role(band_uuid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bm.role
  FROM public.band_members AS bm
  WHERE bm.band_id = band_uuid
    AND bm.user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_band_admin_or_owner(band_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.band_members
    WHERE band_id = band_uuid
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_band_owner(band_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.band_members AS bm
    JOIN public.bands AS b ON b.id = bm.band_id
    WHERE bm.band_id = band_uuid
      AND bm.user_id = auth.uid()
      AND (
        bm.role = 'owner'
        OR b.owner_id = auth.uid()
      )
  );
$$;

-- Atomic band creation: band row + owner membership
CREATE OR REPLACE FUNCTION public.create_band(p_name text)
RETURNS public.bands
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trimmed_name text;
  new_band public.bands;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  trimmed_name := trim(p_name);

  IF trimmed_name IS NULL OR trimmed_name = '' THEN
    RAISE EXCEPTION 'Band name is required';
  END IF;

  INSERT INTO public.bands (name, owner_id)
  VALUES (trimmed_name, auth.uid())
  RETURNING * INTO new_band;

  INSERT INTO public.band_members (band_id, user_id, role)
  VALUES (new_band.id, auth.uid(), 'owner');

  RETURN new_band;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_band_member(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.band_role(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_band_admin_or_owner(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_band_owner(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_band(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Replace public-read policies with membership-scoped policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read bands" ON bands;
DROP POLICY IF EXISTS "Allow public read band_members" ON band_members;

CREATE POLICY "Band members read bands"
  ON bands FOR SELECT
  USING (public.is_band_member(id));

CREATE POLICY "Band members read band_members"
  ON band_members FOR SELECT
  USING (public.is_band_member(band_id));

-- Writes for Phase 1 (create band flow; member management deferred to later phases)
CREATE POLICY "Authenticated users create bands"
  ON bands FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND owner_id = auth.uid()
  );

CREATE POLICY "Users insert own band membership"
  ON band_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Band admins update bands"
  ON bands FOR UPDATE
  USING (public.is_band_admin_or_owner(id))
  WITH CHECK (public.is_band_admin_or_owner(id));

CREATE POLICY "Band owners delete bands"
  ON bands FOR DELETE
  USING (public.is_band_owner(id));
