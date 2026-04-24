import { NextRequest } from 'next/server';
import { DELETE, PATCH } from '@/app/api/notes/[id]/route';
import { GET, POST } from '@/app/api/notes/route';
import { createNote, deleteNote, listNotes, updateNote } from '@/lib/db/queries';

vi.mock('@/lib/db/queries', () => ({
  createNote: vi.fn(),
  deleteNote: vi.fn(),
  listNotes: vi.fn(),
  updateNote: vi.fn(),
}));

const mockedCreateNote = vi.mocked(createNote);
const mockedDeleteNote = vi.mocked(deleteNote);
const mockedListNotes = vi.mocked(listNotes);
const mockedUpdateNote = vi.mocked(updateNote);

describe('notes API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists notes for GET /api/notes', async () => {
    mockedListNotes.mockResolvedValueOnce([
      {
        id: 'note-1',
        title: 'First',
        content: 'Body',
        createdAt: new Date('2026-04-24T12:00:00.000Z'),
        updatedAt: new Date('2026-04-24T12:05:00.000Z'),
      },
    ]);

    const response = await GET(new NextRequest('http://localhost:3000/api/notes?query=first'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedListNotes).toHaveBeenCalledWith('first');
    expect(body.notes).toHaveLength(1);
  });

  it('creates a note for POST /api/notes', async () => {
    mockedCreateNote.mockResolvedValueOnce({
      id: 'note-2',
      title: '',
      content: '',
      createdAt: new Date('2026-04-24T12:00:00.000Z'),
      updatedAt: new Date('2026-04-24T12:00:00.000Z'),
    });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.note.id).toBe('note-2');
  });

  it('updates a note for PATCH /api/notes/[id]', async () => {
    mockedUpdateNote.mockResolvedValueOnce({
      id: 'note-3',
      title: 'Updated',
      content: 'Content',
      createdAt: new Date('2026-04-24T12:00:00.000Z'),
      updatedAt: new Date('2026-04-24T12:06:00.000Z'),
    });

    const request = new NextRequest('http://localhost:3000/api/notes/note-3', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated', content: 'Content' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'note-3' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedUpdateNote).toHaveBeenCalledWith('note-3', { title: 'Updated', content: 'Content' });
    expect(body.note.title).toBe('Updated');
  });

  it('rejects invalid PATCH payloads', async () => {
    const request = new NextRequest('http://localhost:3000/api/notes/note-3', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'x'.repeat(501), content: 'Content' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'note-3' }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid note payload.');
    expect(mockedUpdateNote).not.toHaveBeenCalled();
  });

  it('deletes a note for DELETE /api/notes/[id]', async () => {
    mockedDeleteNote.mockResolvedValueOnce(true);

    const response = await DELETE(new NextRequest('http://localhost:3000/api/notes/note-4', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'note-4' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedDeleteNote).toHaveBeenCalledWith('note-4');
    expect(body.ok).toBe(true);
  });
});
