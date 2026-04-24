"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, LoaderCircle, Plus, Search, Trash2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import type { NoteRecord } from '@/lib/db/queries';
import { cn, formatRelativeTime, noteLabel, notePreview } from '@/lib/utils';

type SaveState = 'idle' | 'saving' | 'saved' | 'dirty' | 'error';

type SaveSnapshot = {
  title: string;
  content: string;
};

type PendingSave = SaveSnapshot & {
  noteId: string;
};

type NoteSaveMeta = {
  state: SaveState;
  retry?: SaveSnapshot;
};

type Props = {
  initialNotes: NoteRecord[];
  initialError?: string;
};

export function NotesApp({ initialNotes, initialError }: Props) {
  const [notes, setNotes] = useState(initialNotes);
  const [selectedId, setSelectedId] = useState(initialNotes[0]?.id ?? null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
  const [saveStates, setSaveStates] = useState<Record<string, NoteSaveMeta>>({});
  const [editorTitle, setEditorTitle] = useState(initialNotes[0]?.title ?? '');
  const [editorContent, setEditorContent] = useState(initialNotes[0]?.content ?? '');
  const [loadingList, setLoadingList] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialError ?? '');
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingSave = useRef<PendingSave | null>(null);
  const latestListRequest = useRef(0);
  const lastSavedSnapshots = useRef<Record<string, SaveSnapshot>>(
    Object.fromEntries(initialNotes.map((note) => [note.id, { title: note.title, content: note.content }])),
  );

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const setNoteSaveState = useCallback((noteId: string, next: NoteSaveMeta) => {
    setSaveStates((current) => ({ ...current, [noteId]: next }));
  }, []);

  const saveNote = useCallback(async (noteId: string, nextTitle: string, nextContent: string, force = false) => {
    if (!noteId) return;

    if (pendingSave.current?.noteId === noteId && pendingSave.current.title === nextTitle && pendingSave.current.content === nextContent) {
      pendingSave.current = null;
    }

    const lastSavedSnapshot = lastSavedSnapshots.current[noteId] ?? { title: '', content: '' };
    const unchanged = lastSavedSnapshot.title === nextTitle && lastSavedSnapshot.content === nextContent;
    if (!force && unchanged) return;

    setNoteSaveState(noteId, { state: 'saving' });

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: nextTitle, content: nextContent }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save note.');
      const note = data.note as NoteRecord;

      lastSavedSnapshots.current[note.id] = { title: note.title, content: note.content };
      setNotes((current) => [note, ...current.filter((item) => item.id !== note.id)].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)));
      setNoteSaveState(note.id, { state: 'saved' });
      setErrorMessage('');
    } catch (error) {
      setNoteSaveState(noteId, { state: 'error', retry: { title: nextTitle, content: nextContent } });
      toast.error(error instanceof Error ? error.message : 'Unable to save note.');
    }
  }, [setNoteSaveState]);

  const flushPendingSave = useCallback(async () => {
    if (!pendingSave.current) return;

    const nextPending = pendingSave.current;
    pendingSave.current = null;

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    await saveNote(nextPending.noteId, nextPending.title, nextPending.content);
  }, [saveNote]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 200);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!selectedNote) {
      setEditorTitle('');
      setEditorContent('');
      return;
    }

    lastSavedSnapshots.current[selectedNote.id] ??= { title: selectedNote.title, content: selectedNote.content };
    setEditorTitle(selectedNote.title);
    setEditorContent(selectedNote.content);
    setSaveStates((current) => current[selectedNote.id] ? current : { ...current, [selectedNote.id]: { state: 'saved' } });
  }, [selectedNote]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const refreshNotes = useCallback(async (query: string, preferredId?: string | null) => {
    const requestId = latestListRequest.current + 1;
    latestListRequest.current = requestId;
    setLoadingList(true);
    try {
      const response = await fetch(`/api/notes${query ? `?query=${encodeURIComponent(query)}` : ''}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load notes.');
      if (requestId !== latestListRequest.current) return;
      setNotes(data.notes);
      setErrorMessage('');

      const nextSelectedId = preferredId ?? selectedId;
      if (nextSelectedId && data.notes.some((note: NoteRecord) => note.id === nextSelectedId)) {
        setSelectedId(nextSelectedId);
      } else {
        setSelectedId(data.notes[0]?.id ?? null);
      }
    } catch (error) {
      if (requestId !== latestListRequest.current) return;
      const message = error instanceof Error ? error.message : 'Unable to load notes.';
      setErrorMessage(message);
    } finally {
      if (requestId === latestListRequest.current) {
        setLoadingList(false);
      }
    }
  }, [selectedId]);

  useEffect(() => {
    void refreshNotes(searchQuery);
  }, [refreshNotes, searchQuery]);

  async function handleCreateNote() {
    setCreating(true);
    try {
      const response = await fetch('/api/notes', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create note.');
      const createdNote = data.note as NoteRecord;
      latestListRequest.current += 1;
      setNotes((current) => [createdNote, ...current.filter((note) => note.id !== createdNote.id)]);
      setSelectedId(createdNote.id);
      setMobileEditorOpen(true);
      setSearchInput('');
      setSearchQuery('');
      setErrorMessage('');
      lastSavedSnapshots.current[createdNote.id] = { title: createdNote.title, content: createdNote.content };
      setNoteSaveState(createdNote.id, { state: 'saved' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create note.');
    } finally {
      setCreating(false);
    }
  }

  function queueSave(noteId: string, nextTitle: string, nextContent: string) {
    const lastSavedSnapshot = lastSavedSnapshots.current[noteId] ?? { title: '', content: '' };
    const unchanged = lastSavedSnapshot.title === nextTitle && lastSavedSnapshot.content === nextContent;

    if (unchanged) {
      if (pendingSave.current?.noteId === noteId) {
        pendingSave.current = null;
      }
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      setNoteSaveState(noteId, { state: 'saved' });
      return;
    }

    pendingSave.current = { noteId, title: nextTitle, content: nextContent };
    setNoteSaveState(noteId, { state: 'dirty', retry: { title: nextTitle, content: nextContent } });

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!pendingSave.current) return;
      const nextPending = pendingSave.current;
      pendingSave.current = null;
      saveTimer.current = null;
      void saveNote(nextPending.noteId, nextPending.title, nextPending.content);
    }, 700);
  }

  async function handleRetrySave() {
    if (!selectedId) return;
    const retryState = saveStates[selectedId]?.retry;
    if (!retryState) return;
    await saveNote(selectedId, retryState.title, retryState.content, true);
  }

  async function handleDeleteNote() {
    if (!selectedId) return;
    try {
      const deletingId = selectedId;
      const response = await fetch(`/api/notes/${deletingId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to delete note.');
      const remaining = notes.filter((note) => note.id !== deletingId);
      setNotes(remaining);
      setSelectedId(remaining[0]?.id ?? null);
      setMobileEditorOpen(false);
      setDeleteOpen(false);
      delete lastSavedSnapshots.current[deletingId];
      setSaveStates((current) => {
        const next = { ...current };
        delete next[deletingId];
        return next;
      });
      if (pendingSave.current?.noteId === deletingId) {
        pendingSave.current = null;
      }
      toast.success('Note deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete note.');
    }
  }

  const activeSaveState = selectedId ? saveStates[selectedId]?.state ?? 'saved' : 'idle';
  const canRetrySave = Boolean(selectedId && saveStates[selectedId]?.retry);
  const saveLabel = {
    idle: 'Ready',
    saving: 'Saving...',
    saved: 'Saved',
    dirty: 'Unsaved changes',
    error: "Couldn't save.",
  }[activeSaveState];

  return (
    <main className="min-h-screen bg-stone-100 p-3 md:p-5">
      <Toaster richColors position="top-right" />
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-7xl overflow-hidden rounded-[28px] border border-stone-200 bg-stone-50 shadow-panel md:min-h-[calc(100vh-2.5rem)]">
        <aside className={cn('w-full border-r border-stone-200 bg-white/90 md:flex md:w-[340px] md:flex-col', mobileEditorOpen && 'hidden md:flex')}>
          <div className="border-b border-stone-200 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-accent">QuickNotes</p>
                <h1 className="mt-1 text-2xl font-semibold text-slate-900">Capture what matters</h1>
              </div>
              <button
                type="button"
                onClick={handleCreateNote}
                disabled={creating}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-medium text-white transition hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {creating ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
                New note
              </button>
            </div>
            <label className="mt-5 flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
              <Search className="size-4 text-slate-400" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search notes"
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400"
                aria-label="Search notes"
              />
            </label>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {errorMessage ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{errorMessage}</div>
            ) : null}
            {loadingList ? <SidebarSkeleton /> : null}
            {!loadingList && notes.length === 0 && searchQuery ? (
              <EmptySidebar
                title="No notes match your search"
                description="Try a different keyword or clear the current search."
                actionLabel="Clear search"
                onAction={() => {
                  setSearchInput('');
                  setSearchQuery('');
                }}
              />
            ) : null}
            {!loadingList && notes.length === 0 && !searchQuery ? (
              <EmptySidebar
                title="No notes yet"
                description="Create your first note and start writing right away."
                actionLabel="New note"
                onAction={handleCreateNote}
              />
            ) : null}
            <div className="space-y-2">
              {notes.map((note) => (
                <button
                  type="button"
                  key={note.id}
                  onClick={() => {
                    if (pendingSave.current?.noteId && pendingSave.current.noteId !== note.id) {
                      void flushPendingSave();
                    }
                    setSelectedId(note.id);
                    setMobileEditorOpen(true);
                  }}
                  className={cn(
                    'w-full rounded-2xl border p-4 text-left transition focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                    selectedId === note.id ? 'border-accent/30 bg-accent-soft' : 'border-transparent bg-transparent hover:border-stone-200 hover:bg-stone-100',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-1 text-sm font-semibold text-slate-900">{noteLabel(note.title)}</p>
                    <span className="shrink-0 text-xs text-slate-500">Edited {formatRelativeTime(note.updatedAt)}</span>
                  </div>
                  <p className="mt-2 line-clamp-1 text-sm text-slate-600">{notePreview(note.content)}</p>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className={cn('flex min-h-[calc(100vh-1.5rem)] flex-1 flex-col bg-stone-50', !mobileEditorOpen && 'hidden md:flex')}>
          <div className="flex items-center justify-between border-b border-stone-200 px-4 py-4 md:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileEditorOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-slate-600 md:hidden"
                aria-label="Back to notes"
              >
                <ArrowLeft className="size-4" />
              </button>
              <div>
                <p className="text-sm font-medium text-slate-500">{selectedNote ? 'Editing note' : 'QuickNotes'}</p>
                <p className="text-sm text-slate-400">{selectedNote ? noteLabel(editorTitle) : 'Select a note or create a new one'}</p>
              </div>
            </div>
            {selectedNote ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <span className={cn('text-sm', activeSaveState === 'error' ? 'text-rose-600' : 'text-slate-500')}>{saveLabel}</span>
                  {activeSaveState === 'error' && canRetrySave ? (
                    <button
                      type="button"
                      onClick={() => void handleRetrySave()}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 focus-visible:ring-2 focus-visible:ring-rose-200"
                    >
                      Retry save
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-slate-500 transition hover:border-rose-200 hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-rose-200"
                  aria-label="Delete note"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ) : null}
          </div>

          {!selectedNote ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="max-w-sm rounded-[28px] border border-dashed border-stone-300 bg-white/80 p-8 text-center shadow-panel">
                <h2 className="text-xl font-semibold text-slate-900">Select a note or create a new one</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">Your notes will appear here with calm autosave, quick search, and a clean writing space.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col px-4 py-5 md:px-8 md:py-8">
              <div className="flex-1 rounded-[28px] border border-stone-200 bg-white px-5 py-5 shadow-panel md:px-8 md:py-8">
                <input
                  value={editorTitle}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (!selectedId) return;
                    setEditorTitle(value);
                    setNotes((current) => current.map((note) => note.id === selectedId ? { ...note, title: value, content: editorContent } : note));
                    queueSave(selectedId, value, editorContent);
                  }}
                  onBlur={() => selectedId ? void saveNote(selectedId, editorTitle, editorContent, true) : undefined}
                  placeholder="Untitled note"
                  aria-label="Note title"
                  className="w-full border-none bg-transparent text-3xl font-semibold text-slate-900 placeholder:text-slate-300"
                />
                <textarea
                  value={editorContent}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (!selectedId) return;
                    setEditorContent(value);
                    setNotes((current) => current.map((note) => note.id === selectedId ? { ...note, title: editorTitle, content: value } : note));
                    queueSave(selectedId, editorTitle, value);
                  }}
                  onBlur={() => selectedId ? void saveNote(selectedId, editorTitle, editorContent, true) : undefined}
                  placeholder="Start writing..."
                  aria-label="Note content"
                  className="mt-5 min-h-[420px] w-full resize-none border-none bg-transparent text-base leading-7 text-slate-700 placeholder:text-slate-300"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                <span>Created {formatRelativeTime(selectedNote.createdAt)}</span>
                <span>Last edited {formatRelativeTime(selectedNote.updatedAt)}</span>
              </div>
            </div>
          )}
        </section>
      </div>

      {deleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-panel">
            <h2 className="text-lg font-semibold text-slate-900">Delete note?</h2>
            <p className="mt-2 text-sm text-slate-500">This permanently deletes this note.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteOpen(false)} className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-slate-600">Cancel</button>
              <button type="button" onClick={() => void handleDeleteNote()} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white">Delete</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function EmptySidebar({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void | Promise<void> }) {
  return (
    <div className="rounded-[24px] border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <button type="button" onClick={() => void onAction()} className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white">{actionLabel}</button>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-3 pb-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-2xl border border-stone-200 bg-white p-4">
          <div className="h-4 w-1/2 rounded bg-stone-200" />
          <div className="mt-3 h-3 w-5/6 rounded bg-stone-100" />
          <div className="mt-2 h-3 w-1/3 rounded bg-stone-100" />
        </div>
      ))}
    </div>
  );
}
