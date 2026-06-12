# Band Practice Song Manager

A responsive web app for managing song lists used in band rehearsals. Built with Next.js, Supabase, and Tailwind CSS.

## Features

- **Rehearsal folders** — Create folders for each practice session with name and date
- **Song management** — Add songs with links to YouTube/Spotify, chord sheets, drum/bass notes, and practice location maps
- **Auto metadata** — Fetches song title and cover art from YouTube and Spotify URLs
- **Authenticated voting** — Sign in to vote; toggle like/dislike without duplicates
- **Search & sort** — Search songs, sort by votes or custom order
- **Drag & drop** — Reorder songs within a folder
- **Copy links** — Quick copy buttons for all resource URLs
- **Dark glassmorphism UI** — Mobile-first, responsive design

## Getting Started

1. Use your existing Supabase project (tables already exist).

2. Run the **ALTER-only** migration in the Supabase SQL Editor:
   - `supabase/migrations/002_auth_and_vote_constraints.sql`
   - Do **not** re-run `001_initial_schema.sql`

3. Enable Email auth in Supabase Dashboard → Authentication → Providers.

4. Configure environment variables in `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

5. Start the app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4
- Supabase (PostgreSQL + Auth)
- Lucide React icons

## Database

Existing tables: `folders`, `songs`, `members`, `votes`

Schema inspection report: `supabase/SCHEMA_REPORT.md`

Incremental migration: `supabase/migrations/002_auth_and_vote_constraints.sql`
