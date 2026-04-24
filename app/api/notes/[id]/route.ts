import { NextResponse } from 'next/server';
import { deleteNote, updateNote } from '@/lib/db/queries';
import { noteUpdateSchema } from '@/lib/validators';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    const parsed = noteUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid note payload.' }, { status: 400 });
    }

    const { id } = await params;
    const note = await updateNote(id, parsed.data);

    if (!note) {
      return NextResponse.json({ error: 'Note not found.' }, { status: 404 });
    }

    return NextResponse.json({ note });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to save note.' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deleted = await deleteNote(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Note not found.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to delete note.' }, { status: 500 });
  }
}
