import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { NotesApp } from '@/components/notes-app';
import type { NoteRecord } from '@/lib/db/queries';

function note(id: string, title: string, content: string, updatedAt = '2026-04-24T12:00:00.000Z'): NoteRecord {
  return {
    id,
    title,
    content,
    createdAt: '2026-04-24T11:00:00.000Z',
    updatedAt,
  } as unknown as NoteRecord;
}

describe('NotesApp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-24T12:10:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders the basic notes shell as a smoke test', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ notes: [note('a', 'Alpha', 'First body')] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      render(React.createElement(NotesApp, { initialNotes: [note('a', 'Alpha', 'First body')] }));
      await Promise.resolve();
    });

    expect(screen.getByText('Capture what matters')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new note/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Alpha')).toBeInTheDocument();
  });

  it('keeps autosave scoped to the edited note when switching notes', async () => {
    const patchCalls: Array<{ url: string; body: { title: string; content: string } }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes('/api/notes') && (!init?.method || init.method === 'GET')) {
        return {
          ok: true,
          json: async () => ({ notes: [note('a', 'Alpha', 'First body'), note('b', 'Bravo', 'Second body')] }),
        };
      }

      if (url.includes('/api/notes/') && init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body));
        patchCalls.push({ url, body });
        return {
          ok: true,
          json: async () => ({ note: note(url.split('/').pop() || 'unknown', body.title, body.content, '2026-04-24T12:11:00.000Z') }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      render(React.createElement(NotesApp, { initialNotes: [note('a', 'Alpha', 'First body'), note('b', 'Bravo', 'Second body')] }));
      await Promise.resolve();
    });

    const textarea = screen.getByLabelText(/note content/i);
    fireEvent.change(textarea, { target: { value: 'First note edited' } });

    fireEvent.click(screen.getByRole('button', { name: /bravo/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    await Promise.resolve();

    expect(patchCalls).toHaveLength(1);
    expect(patchCalls[0].url).toContain('/api/notes/a');
    expect(patchCalls[0].body.content).toBe('First note edited');
  });

  it('clears dirty state when edits are reverted before autosave fires', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes('/api/notes') && (!init?.method || init.method === 'GET')) {
        return {
          ok: true,
          json: async () => ({ notes: [note('a', 'Alpha', 'First body')] }),
        };
      }

      if (url.includes('/api/notes/') && init?.method === 'PATCH') {
        return {
          ok: true,
          json: async () => ({ note: note('a', 'Alpha', 'First body') }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      render(React.createElement(NotesApp, { initialNotes: [note('a', 'Alpha', 'First body')] }));
      await Promise.resolve();
    });

    const textarea = screen.getByLabelText(/note content/i);
    fireEvent.change(textarea, { target: { value: 'Changed body' } });
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: 'First body' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });

    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('focuses search with the keyboard shortcut', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ notes: [note('a', 'Alpha', 'First body')] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      render(React.createElement(NotesApp, { initialNotes: [note('a', 'Alpha', 'First body')] }));
      await Promise.resolve();
    });

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    expect(screen.getByLabelText(/search notes/i)).toHaveFocus();
  });

  it('opens an accessible delete dialog and closes it on escape', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ notes: [note('a', 'Alpha', 'First body')] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      render(React.createElement(NotesApp, { initialNotes: [note('a', 'Alpha', 'First body')] }));
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole('button', { name: /delete note/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('offers a retry action after a failed save and resubmits successfully', async () => {
    let patchAttempts = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes('/api/notes') && (!init?.method || init.method === 'GET')) {
        return {
          ok: true,
          json: async () => ({ notes: [note('a', 'Alpha', 'First body')] }),
        };
      }

      if (url.includes('/api/notes/') && init?.method === 'PATCH') {
        patchAttempts += 1;
        if (patchAttempts === 1) {
          return {
            ok: false,
            json: async () => ({ error: 'Unable to save note.' }),
          };
        }

        const body = JSON.parse(String(init.body));
        return {
          ok: true,
          json: async () => ({ note: note('a', body.title, body.content, '2026-04-24T12:12:00.000Z') }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      render(React.createElement(NotesApp, { initialNotes: [note('a', 'Alpha', 'First body')] }));
      await Promise.resolve();
    });

    const textarea = screen.getByLabelText(/note content/i);
    fireEvent.change(textarea, { target: { value: 'Needs retry' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    await Promise.resolve();

    const retryButton = screen.getByRole('button', { name: /retry save/i });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(patchAttempts).toBe(2);
  });
});
