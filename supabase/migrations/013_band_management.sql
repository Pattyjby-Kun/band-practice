-- 013_band_management.sql
-- Invite disable + member management RPCs. ALTER / CREATE FUNCTION only.

-- ---------------------------------------------------------------------------
-- 1. Soft-disable invites
-- ---------------------------------------------------------------------------
ALTER TABLE band_invites
  ADD COLUMN IF NOT EXISTS disabled_at timestamptz;

CREATE INDEX IF NOT EXISTS band_invites_active_idx
  ON band_invites (band_id)
  WHERE disabled_at IS NULL;

CREATE POLICY "Band admins disable invites"
  ON band_invites FOR UPDATE
  USING (public.is_band_admin_or_owner(band_id))
  WITH CHECK (public.is_band_admin_or_owner(band_id));

-- ---------------------------------------------------------------------------
-- 2. Reject disabled invites on join
-- ---------------------------------------------------------------------------
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

  IF inv.disabled_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invite disabled';
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

-- ---------------------------------------------------------------------------
-- 3. Member management RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leave_band(p_band_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  caller_role := public.band_role(p_band_id);

  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Not a member of this band';
  END IF;

  IF caller_role = 'owner' THEN
    RAISE EXCEPTION 'Owner cannot leave band';
  END IF;

  DELETE FROM public.band_members
  WHERE band_id = p_band_id
    AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_band_member(
  p_band_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  target_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  caller_role := public.band_role(p_band_id);

  IF caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT role
  INTO target_role
  FROM public.band_members
  WHERE band_id = p_band_id
    AND user_id = p_user_id;

  IF target_role IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF target_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot remove owner';
  END IF;

  IF caller_role = 'admin' AND target_role = 'admin' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  DELETE FROM public.band_members
  WHERE band_id = p_band_id
    AND user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_band_member_role(
  p_band_id uuid,
  p_user_id uuid,
  p_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_band_owner(p_band_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  SELECT role
  INTO target_role
  FROM public.band_members
  WHERE band_id = p_band_id
    AND user_id = p_user_id;

  IF target_role IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF target_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot change owner role';
  END IF;

  UPDATE public.band_members
  SET role = p_role
  WHERE band_id = p_band_id
    AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_band(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_band_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_band_member_role(uuid, uuid, text) TO authenticated;
