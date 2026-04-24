import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from './index';
import { notes, type Note } from './schema';

export type NoteRecord = Pick<Note, 'id' | 'title' | 'content' | 'createdAt' | 'updatedAt'>;

function normalizeSearchText(title: string, content: string) {
  return `${title} ${content}`.replace(/\s+/g, ' ').trim();
}

export async function listNotes(query?: string) {
  const db = getDb();
  const normalizedQuery = query?.trim();

  if (!normalizedQuery) {
    return db
      .select({
        id: notes.id,
        title: notes.title,
        content: notes.content,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
      })
      .from(notes)
      .orderBy(desc(notes.updatedAt));
  }

  return db
    .select({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .where(
      and(
        sql`to_tsvector('simple', ${notes.searchText}) @@ plainto_tsquery('simple', ${normalizedQuery})`,
      ),
    )
    .orderBy(desc(notes.updatedAt));
}

export async function createNote() {
  const db = getDb();
  const [note] = await db
    .insert(notes)
    .values({
      title: '',
      content: '',
      searchText: '',
    })
    .returning({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    });

  return note;
}

export async function updateNote(id: string, input: { title: string; content: string }) {
  const db = getDb();
  const title = input.title;
  const content = input.content;
  const [note] = await db
    .update(notes)
    .set({
      title,
      content,
      searchText: normalizeSearchText(title, content),
      updatedAt: new Date(),
    })
    .where(eq(notes.id, id))
    .returning({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    });

  return note ?? null;
}

export async function deleteNote(id: string) {
  const db = getDb();
  const [note] = await db.delete(notes).where(eq(notes.id, id)).returning({ id: notes.id });
  return Boolean(note);
}
