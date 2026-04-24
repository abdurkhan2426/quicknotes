CREATE TABLE IF NOT EXISTS "notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text DEFAULT '' NOT NULL,
  "content" text DEFAULT '' NOT NULL,
  "search_text" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "notes_updated_at_idx" ON "notes" ("updated_at");
CREATE INDEX IF NOT EXISTS "notes_search_text_idx" ON "notes" USING gin (to_tsvector('simple', "search_text"));
