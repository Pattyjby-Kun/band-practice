-- 014_activity_logs_and_folder_media.sql
-- Activity audit trail + folder-level rehearsal media library.

-- ---------------------------------------------------------------------------
-- 1. Band activity logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS band_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS band_activity_logs_band_created_idx
  ON band_activity_logs (band_id, created_at DESC);

CREATE INDEX IF NOT EXISTS band_activity_logs_actor_idx
  ON band_activity_logs (actor_user_id);

ALTER TABLE band_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Band members read activity logs"
  ON band_activity_logs FOR SELECT
  USING (public.is_band_member(band_id));

CREATE POLICY "Band members insert activity logs"
  ON band_activity_logs FOR INSERT
  WITH CHECK (
    public.is_band_member(band_id)
    AND actor_user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 2. Folder media library
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS folder_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  media_type text NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT folder_media_type_check
    CHECK (media_type IN ('google_drive', 'youtube', 'other'))
);

CREATE INDEX IF NOT EXISTS folder_media_folder_id_idx
  ON folder_media (folder_id);

CREATE OR REPLACE FUNCTION public.can_access_folder_media(folder_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.folders AS f
    WHERE f.id = folder_uuid
      AND (
        (f.band_id IS NOT NULL AND public.is_band_member(f.band_id))
        OR (f.band_id IS NULL AND f.owner_id = auth.uid())
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_folder_media(uuid) TO authenticated;

ALTER TABLE folder_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Band members read folder media"
  ON folder_media FOR SELECT
  USING (public.can_access_folder_media(folder_id));

CREATE POLICY "Band members create folder media"
  ON folder_media FOR INSERT
  WITH CHECK (
    public.can_access_folder_media(folder_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "Band members update folder media"
  ON folder_media FOR UPDATE
  USING (public.can_access_folder_media(folder_id))
  WITH CHECK (public.can_access_folder_media(folder_id));

CREATE POLICY "Band members delete folder media"
  ON folder_media FOR DELETE
  USING (public.can_access_folder_media(folder_id));
