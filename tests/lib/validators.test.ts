import { noteUpdateSchema } from '@/lib/validators';

describe('noteUpdateSchema', () => {
  it('accepts valid note payloads', () => {
    const parsed = noteUpdateSchema.parse({ title: 'Hello', content: 'World' });
    expect(parsed).toEqual({ title: 'Hello', content: 'World' });
  });

  it('rejects oversized payloads', () => {
    const parsed = noteUpdateSchema.safeParse({
      title: 'x'.repeat(501),
      content: 'ok',
    });

    expect(parsed.success).toBe(false);
  });
});
