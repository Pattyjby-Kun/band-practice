-- ARCHIVED: initial bootstrap schema.
-- DO NOT RUN on the live database — tables already exist.
-- Use 002_auth_and_vote_constraints.sql for incremental changes.

-- Band Practice Song Manager schema (UUID primary keys)

create extension if not exists "pgcrypto";

create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rehearsal_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  instrument text,
  created_at timestamptz not null default now()
);

create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references folders(id) on delete cascade,
  song_name text not null,
  song_url text not null,
  cover_image text,
  google_map_url text not null,
  chord_url text,
  drum_note_url text,
  bass_note_url text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references songs(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  vote_type text not null check (vote_type in ('like', 'dislike')),
  created_at timestamptz not null default now()
);

create index if not exists songs_folder_id_idx on songs(folder_id);
create index if not exists songs_sort_order_idx on songs(folder_id, sort_order);
create index if not exists votes_song_id_idx on votes(song_id);

alter table folders enable row level security;
alter table members enable row level security;
alter table songs enable row level security;
alter table votes enable row level security;

create policy "Allow public read folders" on folders for select using (true);
create policy "Allow public insert folders" on folders for insert with check (true);
create policy "Allow public update folders" on folders for update using (true);
create policy "Allow public delete folders" on folders for delete using (true);

create policy "Allow public read members" on members for select using (true);
create policy "Allow public insert members" on members for insert with check (true);
create policy "Allow public update members" on members for update using (true);
create policy "Allow public delete members" on members for delete using (true);

create policy "Allow public read songs" on songs for select using (true);
create policy "Allow public insert songs" on songs for insert with check (true);
create policy "Allow public update songs" on songs for update using (true);
create policy "Allow public delete songs" on songs for delete using (true);

create policy "Allow public read votes" on votes for select using (true);
create policy "Allow public insert votes" on votes for insert with check (true);
create policy "Allow public update votes" on votes for update using (true);
create policy "Allow public delete votes" on votes for delete using (true);
