-- 012_band_invites.sql
-- Phase 3: Invite codes for joining bands. CREATE TABLE only (+ functions/policies).
-- Prerequisites: 009_bands.sql, 010_band_roles.sql applied.

CREATE TABLE IF NOT EXISTS band_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz,
  max_uses integer NOT NULL DEFAULT 0,
  current_uses integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT band_invites_max_uses_check CHECK (max_uses >= 0),
  CONSTRAINT band_invites_current_uses_check CHECK (current_uses >= 0)
);

CREATE INDEX IF NOT EXISTS band_invites_band_id_idx ON band_invites (band_id);
CREATE UNIQUE INDEX IF NOT EXISTS band_invites_invite_code_idx ON band_invites (invite_code);

ALTER TABLE band_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Band admins read invites"
  ON band_invites FOR SELECT
  USING (public.is_band_admin_or_owner(band_id));

CREATE POLICY "Band admins create invites"
  ON band_invites FOR INSERT
  WITH CHECK (
    public.is_band_admin_or_owner(band_id)
    AND created_by = auth.uid()
  );

-- Join a band via invite code (atomic: validate, insert member, increment uses)
CREATE OR REPLACE FUNCTION public.join_band_by_invite(p_invite_code text)
RETURNS public.bands
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_code text;
  inv public.band_invites;
  result_band public.bands;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  normalized_code := upper(trim(p_invite_code));

  IF normalized_code IS NULL OR normalized_code = '' THEN
    RAISE EXCEPTION 'Invite code is required';
  END IF;

  SELECT *
  INTO inv
  FROM public.band_invites
  WHERE invite_code = normalized_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    RAISE EXCEPTION 'Invite expired';
  END IF;

  IF inv.max_uses > 0 AND inv.current_uses >= inv.max_uses THEN
    RAISE EXCEPTION 'Invite has reached maximum uses';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.band_members
    WHERE band_id = inv.band_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Already a member of this band';
  END IF;

  INSERT INTO public.band_members (band_id, user_id, role)
  VALUES (inv.band_id, auth.uid(), 'member');

  UPDATE public.band_invites
  SET current_uses = current_uses + 1
  WHERE id = inv.id;

  SELECT * INTO result_band FROM public.bands WHERE id = inv.band_id;
  RETURN result_band;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_band_by_invite(text) TO authenticated;
