# Rehearsal Location Migration

Move practice location from `songs.google_map_url` → `folders.practice_location_*`.

## Execution order

1. `003_add_folder_practice_location.sql` — add columns
2. `004_migrate_song_locations_to_folders.sql` — copy existing data
3. Deploy application code (reads/writes folder location)
4. **Do not run** `005_future_drop_songs_google_map_url.sql` until verified in production

## Database impact

| Table | Change | Data loss |
|---|---|---|
| `folders` | +2 nullable columns | None |
| `songs` | `google_map_url` unchanged | None |
| `songs` (Phase 4 only) | drop `google_map_url` | Column removed; backup required |

## Rollback strategy

**After Phase 1–2 only (recommended safe window):**
- Revert application to previous release (still reads `songs.google_map_url`).
- Optional: `UPDATE folders SET practice_location_name = NULL, practice_location_url = NULL;`
- `songs.google_map_url` still contains original data.

**After Phase 4 (column dropped):**
- Restore database from backup taken before Phase 4.
- Cannot recover `google_map_url` from folders alone if URLs differed per song.

## Data migration assumptions

- One rehearsal location per folder (session-level).
- When songs disagree, the majority URL is chosen.
- Location name was not stored on songs; migrated name defaults to `'Rehearsal Location'`.
