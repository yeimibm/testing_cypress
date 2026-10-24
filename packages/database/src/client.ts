import BetterSqlite3 from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as productSchema from './schema/products.js';
import * as orderSchema from './schema/orders.js';
export const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
export function resolveDatabasePath(value = '.data/development.sqlite'): string { return resolve(repositoryRoot, value); }
const schema = { ...productSchema, ...orderSchema };
export interface DatabaseHandle {
  db: BetterSQLite3Database<typeof schema>;
  sqlite: BetterSqlite3.Database;
  path: string;
  close(): void;
}
export function createDatabase(databasePath: string): DatabaseHandle {
  const path = resolveDatabasePath(databasePath);
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new BetterSqlite3(path);
  try {
    sqlite.pragma('foreign_keys = ON'); sqlite.pragma('journal_mode = WAL'); sqlite.pragma('busy_timeout = 5000');
    return { db: drizzle(sqlite, { schema }), sqlite, path, close: () => sqlite.close() };
  } catch (error) { sqlite.close(); throw error; }
}
