import { NextResponse } from 'next/server';
import { createNote, listNotes } from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') ?? '';
    const notes = await listNotes(query);
    return NextResponse.json({ notes });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to load notes.' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const note = await createNote();
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to create note.' }, { status: 500 });
  }
}
