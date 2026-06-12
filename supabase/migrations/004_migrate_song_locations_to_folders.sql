-- Phase 2: Copy practice location from songs → folders
-- DO NOT drop songs.google_map_url here (kept for rollback / Phase 4).
--
-- Assumptions:
-- 1. songs.google_map_url holds the legacy per-song location URL.
-- 2. songs do not store a location name; only a URL exists.
-- 3. When a folder has songs with different URLs, the most frequently used
--    URL wins (ties broken by earliest song created_at).
-- 4. Only folders with NULL practice_location_url are updated (idempotent).
-- 5. practice_location_name defaults to 'Rehearsal Location' when a URL is copied.

WITH ranked_locations AS (
  SELECT
    s.folder_id,
    s.google_map_url,
    COUNT(*) AS usage_count,
    MIN(s.created_at) AS first_used_at,
    ROW_NUMBER() OVER (
      PARTITION BY s.folder_id
      ORDER BY COUNT(*) DESC, MIN(s.created_at) ASC
    ) AS rank
  FROM songs s
  WHERE s.google_map_url IS NOT NULL
    AND TRIM(s.google_map_url) <> ''
  GROUP BY s.folder_id, s.google_map_url
)
UPDATE folders f
SET
  practice_location_url = rl.google_map_url,
  practice_location_name = COALESCE(
    f.practice_location_name,
    'Rehearsal Location'
  )
FROM ranked_locations rl
WHERE f.id = rl.folder_id
  AND rl.rank = 1
  AND f.practice_location_url IS NULL;
