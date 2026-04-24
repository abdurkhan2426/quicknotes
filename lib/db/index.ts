import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured. Copy .env.example to .env.local and set your Neon connection string.');
  }

  dbInstance = drizzle(neon(databaseUrl), { schema });
  return dbInstance;
}
