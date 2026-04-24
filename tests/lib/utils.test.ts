import { formatRelativeTime, noteLabel, notePreview } from '@/lib/utils';

describe('lib/utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('falls back to Untitled note for blank titles', () => {
    expect(noteLabel('   ')).toBe('Untitled note');
    expect(noteLabel('Plan')).toBe('Plan');
  });

  it('builds a compact preview from note content', () => {
    expect(notePreview('Line 1\n\n  Line 2')).toBe('Line 1 Line 2');
    expect(notePreview('   ')).toBe('No additional text');
  });

  it('formats recent timestamps in relative time', () => {
    const now = new Date('2026-04-24T12:00:00.000Z');
    vi.setSystemTime(now);

    expect(formatRelativeTime(new Date('2026-04-24T11:58:00.000Z'))).toContain('2 minutes ago');
    expect(formatRelativeTime(new Date('2026-04-24T12:00:00.000Z'))).toBe('this minute');
  });
});
