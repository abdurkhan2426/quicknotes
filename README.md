# QuickNotes

QuickNotes is a lightweight notes app built with Next.js, TypeScript, Tailwind CSS, Drizzle ORM, and Neon PostgreSQL.

## Features

- Responsive 2-pane notes layout on desktop and stacked mobile editor flow
- Immediate note creation with autosave for title/content edits
- Keyword search across note titles and content
- Explicit delete confirmation with toast feedback
- Typed database access layer and reproducible SQL migration

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the sample environment file and add your Neon connection string:

   ```bash
   cp .env.example .env.local
   ```

3. Apply the database schema:

   ```bash
   npm run db:push
   ```

   Or run the SQL in `drizzle/0000_initial.sql` manually against your database.

4. Start the app:

   ```bash
   npm run dev
   ```

## Environment

- `DATABASE_URL`: Neon PostgreSQL connection string

## Scripts

- `npm run dev` - start the local dev server
- `npm run build` - production build
- `npm run lint` - Next.js linting
- `npm run db:generate` - generate Drizzle migration files
- `npm run db:push` - push the current schema to PostgreSQL
- `npm run db:studio` - open Drizzle Studio

## Notes

- Search uses PostgreSQL full-text search over a normalized `search_text` column.
- The app intentionally keeps scope small: plain text notes, autosave, delete confirmation, and keyword-only search.
