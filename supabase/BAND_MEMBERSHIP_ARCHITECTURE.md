# Band Membership & Invitation Architecture

**Status:** Design / analysis only — no migrations or implementation yet.

This document describes the target architecture for band membership, roles, invitations, RLS, API, UI, and migration from the current system. It is grounded in:

- `009_bands.sql` — `bands`, `band_members` (no roles, public read RLS)
- `006_folder_ownership.sql` — `folders.owner_id`, owner-only folder write
- `008_song_permissions_authenticated.sql` — any authenticated user can manage songs
- `002_auth_and_vote_constraints.sql` — `members` voting profiles
- `007_backfill_folder_owners.sql` — legacy folder ownership backfill

---

## Architecture Overview

The app currently has **three overlapping identity layers**:

| Layer | Table | Purpose today |
|---|---|---|
| Auth | `auth.users` | Login identity |
| Voting profile | `members` | Display name + instrument; one row per user for votes |
| Band org | `bands` + `band_members` | Multi-band container (no roles, public read RLS) |
| Rehearsal data | `folders` → `songs` → `votes` | Setlists scoped globally, not by band |

### Target model

**Band is the tenancy boundary:**

```
User ──joins──► band_members (role) ──belongs to──► Band ──contains──► folders ──contains──► songs
                                                                                      └── votes (via members profile)
```

### Core principles

1. **Visibility is membership-based** — a user only sees bands (and their folders/songs) where they have a `band_members` row.
2. **Roles live on `band_members`** — Owner / Admin / Member drive authorization.
3. **`bands.owner_id` is denormalized** — kept for fast owner lookup and migration compatibility; must stay in sync with the Owner role row.
4. **`members` stays separate** — it is the voting persona, not org membership. Do not merge it with `band_members`.
5. **`folders.band_id` is the link** — every rehearsal folder belongs to exactly one band.
6. **Invitations are first-class rows** — not implicit “add by email in band_members”.

### What changes philosophically

| Today | Target |
|---|---|
| Sidebar shows placeholder bands | Sidebar loads `GET /api/bands` (membership-filtered) |
| Folders are globally readable | Folders readable only to band members |
| Folder `owner_id` controls folder edit/delete | Band Owner/Admin control folder metadata; `owner_id` becomes audit/legacy |
| Any authenticated user edits any song (008) | Any **band member** edits songs in that band’s folders |
| Public RLS on `bands` / `band_members` | Member-scoped RLS everywhere |

### Naming note

`members` (voting) vs `band_members` (org) is confusing. In TypeScript, refer to them as **VoteProfile** / **BandMembership** even if table names stay unchanged.

---

## ER Diagram (Text)

```
auth.users
    │
    ├──1:1──► members (voting profile: display_name, instrument)
    │              │
    │              └──► votes.member_id
    │
    ├──1:N──► band_members ──N:1──► bands
    │           (role: owner|admin|member)      │
    │                                           │
    └──invited_by / accepted_by                 ├──1:N──► band_invitations
                                                │           (email, role, token, status, expires_at)
                                                │
                                                └──1:N──► folders
                                                            (band_id FK, owner_id legacy)
                                                                │
                                                                └──1:N──► songs
                                                                            │
                                                                            └──1:N──► votes
```

### Relationships

- `bands.owner_id` → `auth.users.id` (nullable, SET NULL on delete)
- `band_members.(band_id, user_id)` unique
- `band_members.role` → enum/check constraint
- `band_invitations.band_id` → `bands.id`
- `band_invitations.invited_by` → `auth.users.id`
- `band_invitations.accepted_by` → `auth.users.id` (nullable until accepted)
- `folders.band_id` → `bands.id` (nullable during migration, NOT NULL after backfill)
- `folders.owner_id` → `auth.users.id` (kept; semantic shifts to “created_by”)

---

## Roles and Permissions Matrix

Roles are **per band**, stored on `band_members.role`.

| Action | Owner | Admin | Member | Non-member |
|---|---|---|---|---|
| **Band** | | | | |
| View band in sidebar | ✓ | ✓ | ✓ | ✗ |
| Rename band | ✓ | ✓ | ✗ | ✗ |
| Delete band | ✓ | ✗ | ✗ | ✗ |
| Transfer ownership | ✓ | ✗ | ✗ | ✗ |
| View member list | ✓ | ✓ | ✓ | ✗ |
| Invite users | ✓ | ✓ | ✗ | ✗ |
| Revoke pending invite | ✓ | ✓ | ✗ | ✗ |
| Change member role | ✓ | ✓* | ✗ | ✗ |
| Remove member | ✓ | ✓* | ✗ | ✗ |
| Leave band | ✓** | ✓ | ✓ | ✗ |
| **Folders** | | | | |
| View folders in band | ✓ | ✓ | ✓ | ✗ |
| Create folder | ✓ | ✓ | ✓ | ✗ |
| Edit folder (name, date, location) | ✓ | ✓ | ✗*** | ✗ |
| Delete folder | ✓ | ✓ | ✗ | ✗ |
| **Songs** | | | | |
| View songs | ✓ | ✓ | ✓ | ✗ |
| Add / edit / delete / reorder songs | ✓ | ✓ | ✓ | ✗ |
| **Votes** | | | | |
| Vote on songs | ✓ | ✓ | ✓ | ✗ (must be signed in + band member) |

\* Admin cannot promote to Owner, demote Owner, or remove Owner.  
\*\* Owner must transfer ownership before leaving (or delete band).  
\*\*\* With bands, folder metadata edit shifts to Owner/Admin of the **band**, not `folders.owner_id`.

### Role invariants (enforce in DB + API)

- Exactly **one Owner** per band at all times.
- Creator of a band becomes Owner (`band_members.role = 'owner'` + `bands.owner_id = auth.uid()`).
- Owner cannot be removed without transfer or band deletion.

---

## Invitation System Design

### Table: `band_invitations`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `band_id` | uuid FK → bands | |
| `email` | text NOT NULL | Normalized lowercase; invitee may not have account yet |
| `role` | text | `admin` or `member` only (never `owner` via invite) |
| `token` | text UNIQUE | Cryptographically random; used in accept URL |
| `status` | text | `pending` \| `accepted` \| `declined` \| `expired` \| `revoked` |
| `invited_by` | uuid FK → auth.users | |
| `accepted_by` | uuid FK → auth.users | Set on accept |
| `expires_at` | timestamptz | e.g. 7 days |
| `created_at` | timestamptz | |
| `responded_at` | timestamptz | nullable |

**Indexes:** `(band_id, email)` where status = pending (prevent duplicate pending invites), `(token)`, `(email, status)`.

### Invite flow

```
1. Admin → POST /api/bands/{id}/invitations { email, role }
2. API → INSERT band_invitations (pending, token)
3. API → Send link /invite/{token} (email — future)
4. Invitee → GET /api/invitations/{token} (preview band + role)
5. If not signed in → /login?returnUrl=/invite/{token}
6. Invitee → POST /api/invitations/{token}/accept
7. API → Verify email matches auth.users.email
8. API → INSERT band_members (role from invite)
9. API → UPDATE invitation status = accepted
10. App → Set active band, redirect to home
```

### Invitation rules

1. Only Owner/Admin can create invitations.
2. Invitee email must match `auth.users.email` on accept.
3. If user already a member → accept marks invite accepted (idempotent).
4. Expired/revoked invites return 410 Gone.
5. **No self-invite to Owner** — ownership transfer is a separate endpoint.
6. v1 may use “copy invite link” without email delivery.

### Ownership transfer (separate from invite)

```
POST /api/bands/{id}/transfer-ownership { new_owner_user_id }
  → Caller must be Owner
  → Promote target to Owner, demote caller to Admin (or Member)
  → Update bands.owner_id
```

---

## RLS Strategy

Replace today’s **public read** on bands with **membership-scoped** policies. Use helper functions to keep policies readable.

### Recommended SQL helpers (future migration)

```sql
-- Pseudocode — not migration SQL
is_band_member(band_id)       → EXISTS band_members WHERE user_id = auth.uid()
band_role(band_id)            → role from band_members
is_band_admin_or_owner(band_id) → role IN ('owner','admin')
is_band_owner(band_id)        → role = 'owner' OR bands.owner_id = auth.uid()
folder_band_id(folder_id)     → folders.band_id
```

### `bands`

| Operation | Policy |
|---|---|
| SELECT | `is_band_member(id)` |
| INSERT | `auth.uid() IS NOT NULL` + caller becomes owner (via trigger or SECURITY DEFINER function) |
| UPDATE | `is_band_admin_or_owner(id)` |
| DELETE | `is_band_owner(id)` |

**Drop:** `"Allow public read bands"`.

### `band_members`

| Operation | Policy |
|---|---|
| SELECT | `is_band_member(band_id)` |
| INSERT | Accept-invite path OR owner bootstrap on band create |
| UPDATE | Owner/Admin can change roles (constraints in trigger) |
| DELETE | Owner/Admin remove others; user can delete own row (leave), except Owner |

**Bootstrap:** Use a `SECURITY DEFINER` function `create_band(name)` that inserts band + owner membership atomically (recommended over service role).

### `band_invitations`

| Operation | Policy |
|---|---|
| SELECT | Admin/Owner of band OR invitee email matches JWT email |
| INSERT | `is_band_admin_or_owner(band_id)` |
| UPDATE | Admin/Owner revoke; invitee accept/decline own pending invite |

Token-based accept may use `SECURITY DEFINER accept_band_invitation(token)`.

### `folders`

| Operation | Policy |
|---|---|
| SELECT | `is_band_member(band_id)` when `band_id IS NOT NULL`; transitional NULL during migration |
| INSERT | `is_band_member(band_id)` |
| UPDATE/DELETE | `is_band_admin_or_owner(band_id)` |

**Drop/replace:** `"Allow public read folders"`.

### `songs`

Scope via folder’s band:

| Operation | Policy |
|---|---|
| SELECT | `is_band_member(folder_band_id(folder_id))` |
| INSERT/UPDATE/DELETE | `is_band_member(...)` — all roles |

**Replace** 008’s global `auth.uid() IS NOT NULL` policies.

### `votes`

Keep own-vote logic via `members.user_id = auth.uid()`, **plus** band membership:

```text
WITH CHECK (
  member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  AND is_band_member(folder_band_id(song.folder_id))
)
```

### `members` (voting profile)

Keep current self-service policies; unchanged.

---

## API Design

All band endpoints require auth unless noted. Accept invite requires auth at accept time.

### Bands

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/bands` | ✓ | List bands for current user |
| POST | `/api/bands` | ✓ | Create band + self as Owner |
| GET | `/api/bands/[id]` | ✓ member | Band detail + caller’s role |
| PATCH | `/api/bands/[id]` | ✓ admin+ | Rename band |
| DELETE | `/api/bands/[id]` | ✓ owner | Delete band (cascades folders) |
| POST | `/api/bands/[id]/transfer-ownership` | ✓ owner | Transfer ownership |

### Band members

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/bands/[id]/members` | ✓ member | List members with roles + display names |
| PATCH | `/api/bands/[id]/members/[userId]` | ✓ admin+ | Change role |
| DELETE | `/api/bands/[id]/members/[userId]` | ✓ admin+ or self | Remove / leave |

### Invitations

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/bands/[id]/invitations` | ✓ admin+ | List pending invites |
| POST | `/api/bands/[id]/invitations` | ✓ admin+ | Create invite `{ email, role }` |
| DELETE | `/api/bands/[id]/invitations/[id]` | ✓ admin+ | Revoke |
| GET | `/api/invitations/[token]` | optional | Public preview |
| POST | `/api/invitations/[token]/accept` | ✓ | Accept |
| POST | `/api/invitations/[token]/decline` | ✓ | Decline |

### Folders (changes)

| Method | Path | Change |
|---|---|---|
| GET | `/api/folders` | Filter by `?band_id=` or active band |
| POST | `/api/folders` | Require `band_id`; caller must be band member |
| PATCH/DELETE | `/api/folders/[id]` | Check band admin+ instead of `folder.owner_id` |

### Songs (changes)

Keep existing routes; add band membership check via `song.folder_id → folders.band_id`.

### Example response shapes

```typescript
// GET /api/bands
{ bands: [{ id, name, role, member_count, created_at }] }

// GET /api/bands/[id]/members
{ members: [{ user_id, display_name, role, joined_at }] }
```

---

## UI Flow

### Sidebar (`useBands` / `useActiveBand`)

1. On login → `GET /api/bands` → populate sidebar.
2. Active band in React state → later `localStorage` key `activeBandId`.
3. Switching band → refetch folders for that `band_id`.
4. **+ Create Band** → modal → `POST /api/bands` → set active.

### Band settings (new page or modal)

- **Members tab:** list, role badges, remove (admin+).
- **Invites tab:** email + role, pending list, copy link, revoke.
- **Danger zone:** delete band (owner), transfer ownership (owner).

### Invitation accept page `/invite/[token]`

1. Show band name + invited role.
2. If not logged in → login/register with return URL.
3. Accept → join band → redirect home with band active.
4. Email mismatch → error (“sign in with invited email”).

### Folder / song pages

- Home shows folders **for active band only**.
- Edit Folder → band Owner/Admin only.
- Add/Edit/Delete/Reorder songs → all band members.

### Empty states

| State | UI |
|---|---|
| No bands | “Create your first band” |
| Band with no folders | Current empty state, scoped to band |
| Pending invite | Email link / optional nav badge |

---

## Linking Folders and Songs to Bands

### Schema change (future)

```text
ALTER TABLE folders ADD COLUMN band_id uuid REFERENCES bands(id);
CREATE INDEX folders_band_id_idx ON folders(band_id);
```

**Songs:** no direct `band_id` — inherit via `folder_id`.

```text
folders WHERE band_id = :activeBandId
songs WHERE folder_id IN (SELECT id FROM folders WHERE band_id = :activeBandId)
```

### Semantic of `folders.owner_id` after linking

| Field | New meaning |
|---|---|
| `folders.band_id` | Tenancy — who can see this folder |
| `folders.owner_id` | `created_by` audit field |

**Recommendation:** keep `owner_id` for audit; stop using it for authorization once band RLS is live.

---

## Migration Roadmap

Phased, ALTER-only, no data loss. Verify each phase before the next.

### Phase 0 — Current state (done)

- `bands`, `band_members` exist
- Public read RLS (temporary)
- Placeholder sidebar
- Folders/songs not linked to bands

### Phase 1 — Membership foundation (no invites yet)

**DB:** Add `band_members.role` (`owner` \| `admin` \| `member`); backfill Owner from `bands.owner_id`.

**Data:** Create default band per user with folders; Owner membership.

**RLS:** Membership-scoped SELECT; `create_band()` SECURITY DEFINER function.

**API/UI:** Wire `useBands()` to `GET /api/bands`; create band flow.

### Phase 2 — Link folders to bands

**DB:** Add `folders.band_id` nullable → backfill → NOT NULL when safe.

**RLS:** Scope folder/song read/write to band membership; replace 008 global song policies.

**API/UI:** Pass `band_id` on folder create; home filters by active band.

### Phase 3 — Invitations

**DB:** Create `band_invitations` + RLS + accept function.

**API/UI:** Invite modal, `/invite/[token]` page, member management.

### Phase 4 — Role enforcement in API/UI

- Folder edit/delete → admin+ check (replace `requireFolderOwner` with `requireBandRole`).
- Member role management UI.
- Ownership transfer.

### Phase 5 — Cleanup

- Remove placeholder data paths.
- Deprecate folder-level owner checks in API.
- Document `members` vs `band_members` in SCHEMA_REPORT.

### Backfill strategy for production data

| Scenario | Action |
|---|---|
| Single admin owns all legacy folders | One band, one Owner, all folders get that `band_id` |
| Multiple folder owners | One band per distinct `owner_id` |
| Folders with `owner_id NULL` | Assign to migration operator or “Legacy Band” |

**Idempotent backfill pattern:**

1. Create band per owner (or single band).
2. Insert `band_members` Owner row.
3. `UPDATE folders SET band_id = … WHERE owner_id = … AND band_id IS NULL`.
4. Verify zero NULL `band_id` before NOT NULL constraint.

### Rollback strategy

| Phase | Rollback |
|---|---|
| Phase 1 | Restore public read policies; role column can remain |
| Phase 2 | `band_id` nullable; revert folder/song RLS to 008 |
| Phase 3 | Drop invitation table; membership remains |

---

## Key Risks and Decisions

| Risk | Mitigation |
|---|---|
| `members` vs `band_members` confusion | Clear naming in code/docs; never merge tables |
| Chicken-and-egg RLS on band create | SECURITY DEFINER `create_band()` |
| 008 allows any user to edit any song | Phase 2 must replace song RLS before multi-band launch |
| Public folder read today | Tightening RLS breaks anonymous browsing — intentional |
| Owner leave edge case | Block leave until transfer or delete band |
| Invite email vs OAuth email mismatch | Clear error; admin re-invites |

---

## Implementation Order (Recommended)

When ready to implement, start with **Phase 1 only**:

1. Migration: `band_members.role` + RLS helpers + `create_band()` function
2. API: `GET/POST /api/bands`
3. UI: wire sidebar to real bands; create band modal

Do **not** ship Phase 2 (folder linking) until Phase 1 is verified in production.

---

## Related files (current codebase)

| File | Relevance |
|---|---|
| `supabase/migrations/009_bands.sql` | Existing bands tables |
| `src/components/bands/BandProvider.tsx` | Placeholder → wire to API |
| `src/hooks/useBands.ts` | `refreshBands()` integration point |
| `src/hooks/useActiveBand.ts` | Active band state |
| `src/lib/auth-api.ts` | Pattern for `requireBandRole()` |
| `src/app/api/folders/*` | Folder auth to migrate to band roles |
