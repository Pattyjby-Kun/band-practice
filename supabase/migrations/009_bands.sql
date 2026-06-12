-- 009_bands.sql
-- Creates bands and band_members tables for multi-band support.
-- Does not connect folders yet. Safe for existing production data.

CREATE TABLE IF NOT EXISTS bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS band_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bands_owner_id_idx ON bands (owner_id);
CREATE INDEX IF NOT EXISTS band_members_band_id_idx ON band_members (band_id);
CREATE INDEX IF NOT EXISTS band_members_user_id_idx ON band_members (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS band_members_band_id_user_id_unique
  ON band_members (band_id, user_id);

ALTER TABLE bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read bands"
  ON bands FOR SELECT
  USING (true);

CREATE POLICY "Allow public read band_members"
  ON band_members FOR SELECT
  USING (true);

-- Writes deferred until band API is implemented.
