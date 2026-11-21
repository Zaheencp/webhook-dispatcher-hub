import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let cachedSql: NeonQueryFunction<false, false> | null = null;

export function getNeonSql(): NeonQueryFunction<false, false> | null {
  const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString || !connectionString.startsWith('postgres')) {
    return null;
  }

  if (!cachedSql) {
    cachedSql = neon(connectionString);
  }

  return cachedSql;
}
