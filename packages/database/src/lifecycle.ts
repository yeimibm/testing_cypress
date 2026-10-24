import { lstatSync, realpathSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDatabase, repositoryRoot, resolveDatabasePath, type DatabaseHandle } from './client.js';
import { products } from './schema/products.js';
import { orderItems, orders } from './schema/orders.js';

export const seedProducts = [
  { id: 'espresso', name: 'Espresso', priceMinor: 1500, available: true },
  { id: 'latte', name: 'Latte', priceMinor: 2200, available: true },
  { id: 'mocha', name: 'Mocha', priceMinor: 2500, available: false },
];
function insertSeed(handle: DatabaseHandle): void {
  handle.db.insert(products).values(seedProducts).onConflictDoNothing().run();
}
export function migrateDatabase(path: string): void {
  const handle = createDatabase(path);
  try { migrate(handle.db, { migrationsFolder: fileURLToPath(new URL('../migrations/', import.meta.url)) }); }
  finally { handle.close(); }
}
export function seedDatabase(path: string): void {
  const handle = createDatabase(path);
  try { handle.sqlite.transaction(() => insertSeed(handle)).immediate(); }
  finally { handle.close(); }
}
export function resetDatabase(path: string, environment: 'development' | 'test'): void {
  if (process.env.NODE_ENV === 'production' || !['development', 'test'].includes(environment)) throw new Error('Database reset is restricted to development and test.');
  const expected = resolveDatabasePath(environment === 'test' ? '.data/e2e.sqlite' : '.data/development.sqlite');
  const resolved = resolveDatabasePath(path);
  const testDirectory = resolveDatabasePath('.data/tests');
  const isolatedTestFile = environment === 'test' && process.env.NODE_ENV === 'test'
    && dirname(resolved) === testDirectory
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.sqlite$/i.test(relative(testDirectory, resolved));
  if (resolved !== expected && !isolatedTestFile) throw new Error('Reset requires a designated development or test database path.');
  // Refuse linked data paths before opening a potentially unrelated database.
  let current = resolve(repositoryRoot);
  for (const part of ['', ...relative(current, resolved).split(sep)]) {
    current = join(current, part);
    try {
      if (lstatSync(current).isSymbolicLink() || realpathSync(current) !== current) throw new Error('Linked database paths cannot be reset.');
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') break;
      throw error;
    }
  }
  migrateDatabase(resolved);
  const handle = createDatabase(resolved);
  try {
    handle.sqlite.transaction(() => {
      handle.db.delete(orderItems).run(); handle.db.delete(orders).run(); handle.db.delete(products).run(); insertSeed(handle);
    }).immediate();
  } finally { handle.close(); }
}
