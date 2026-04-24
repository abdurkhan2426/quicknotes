import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const notes = pgTable(
  'notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull().default(''),
    content: text('content').notNull().default(''),
    searchText: text('search_text')
      .notNull()
      .default('')
      .$defaultFn(() => ''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => ({
    updatedAtIdx: index('notes_updated_at_idx').on(table.updatedAt),
    searchTextIdx: index('notes_search_text_idx').using('gin', sql`to_tsvector('simple', ${table.searchText})`),
  }),
);

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
