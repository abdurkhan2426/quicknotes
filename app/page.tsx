import { NotesApp } from '@/components/notes-app';
import { listNotes } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  try {
    const notes = await listNotes();
    return <NotesApp initialNotes={notes} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load notes.';
    return <NotesApp initialNotes={[]} initialError={message} />;
  }
}
