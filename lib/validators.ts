import { z } from 'zod';

export const noteUpdateSchema = z.object({
  title: z.string().max(500).default(''),
  content: z.string().max(50000).default(''),
});
