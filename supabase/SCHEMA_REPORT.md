# Schema Inspection Report

Inspected against live Supabase project on 2026-06-11 via REST API sample queries.

## What exists

### `folders`
| Column | Type (observed) |
|---|---|
| id | uuid |
| name | text |
| rehearsal_date | date |
| created_at | timestamptz |

### `songs`
| Column | Type (observed) |
|---|---|
| id | uuid |
| folder_id | uuid |
| song_name | text |
| song_url | text |
| cover_image | text (nullable) |
| artist_name | text (nullable) |
| google_map_url | text |
| chord_url | text (nullable) |
| drum_note_url | text (nullable) |
| bass_note_url | text (nullable) |
| bpm | unknown (nullable) |
| original_key | text (nullable) |
| band_key | text (nullable) |
| notes | text (nullable) |
| status | text (default `not_started`) |
| sort_order | integer |
| created_at | timestamptz |

### `members`
- Table exists; live columns: `id`, `display_name`, `created_at`, `user_id`, `instrument`

### `votes`
| Column | Type (observed) |
|---|---|
| id | uuid |
| song_id | uuid |
| member_id | uuid (nullable) |
| vote_type | text (`like` / `dislike`) |
| created_at | timestamptz |

**Observed issues:**
- Existing rows may have `member_id = null` (legacy anonymous votes) — preserved intentionally.
- No unique constraint on `(song_id, member_id)` — allows duplicate votes.
- No `user_id` column (not required if using `member_id` via `members.user_id`).
- Public RLS insert/update/delete policies allow unlimited duplicate votes.

## What needs to be added (ALTER only)

See `002_auth_and_vote_constraints.sql`:

1. `members.user_id uuid references auth.users(id)` + unique index
2. `members.instrument text` if missing (safe no-op if present)
3. Unique partial index on `votes(song_id, member_id)` where `member_id is not null`
4. `votes_vote_type_check` constraint if missing
5. Replace permissive vote/member write RLS with auth-scoped policies
6. **No CREATE TABLE statements**

## SQL to run

Execute **`supabase/migrations/002_auth_and_vote_constraints.sql`** in the Supabase SQL Editor.

Do **not** re-run `001_initial_schema.sql` — tables already exist.

## Application changes

- Supabase Auth (email/password) for identifying voters
- Auto-create `members` row linked to `auth.users.id` on first vote
- Toggle vote logic: same vote removes, opposite vote switches
- Legacy votes with `member_id = null` remain in totals
