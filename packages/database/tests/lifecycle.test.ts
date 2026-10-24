import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase, migrateDatabase, seedDatabase, resetDatabase, type DatabaseHandle } from '../src/index.js';

const handles: DatabaseHandle[] = [];
const directories: string[] = [];
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'coffee-test-'));
  directories.push(directory);
  const path = join(directory, 'test.sqlite');
  migrateDatabase(path);
  const handle = createDatabase(path);
  handles.push(handle);
  return { path, handle };
}
afterEach(() => { for (const handle of handles.splice(0)) handle.close(); for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }); });

describe('SQLite lifecycle', () => {
  it('migrates a fresh database and can apply migrations again', () => {
    const { path, handle } = fixture();
    expect(handle.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('products','orders','order_items') ORDER BY name").all()).toEqual([{ name: 'order_items' }, { name: 'orders' }, { name: 'products' }]);
    expect(() => migrateDatabase(path)).not.toThrow();
    expect(handle.sqlite.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(handle.sqlite.pragma('journal_mode', { simple: true })).toBe('wal');
  });
  it('seeds exact products without overwriting catalog edits or deleting orders', () => {
    const { path, handle } = fixture();
    seedDatabase(path);
    expect(handle.sqlite.prepare('SELECT id, price_minor, available FROM products ORDER BY id').all()).toEqual([{ id: 'espresso', price_minor: 1500, available: 1 }, { id: 'latte', price_minor: 2200, available: 1 }, { id: 'mocha', price_minor: 2500, available: 0 }]);
    handle.sqlite.prepare("UPDATE products SET price_minor = 1700 WHERE id = 'espresso'").run();
    handle.sqlite.prepare("INSERT INTO orders (id,total_minor,currency,created_at) VALUES ('existing',1700,'GTQ','2026-01-01T00:00:00.000Z')").run();
    seedDatabase(path);
    expect(handle.sqlite.prepare("SELECT price_minor FROM products WHERE id='espresso'").get()).toEqual({ price_minor: 1700 });
    expect(handle.sqlite.prepare('SELECT count(*) AS count FROM orders').get()).toEqual({ count: 1 });
  });
  it('refuses to reset arbitrary files and mismatched environments', () => {
    const { path } = fixture();
    expect(() => resetDatabase(path, 'test')).toThrow();
    expect(() => resetDatabase('../../outside.sqlite', 'development')).toThrow();
  });
  it('enforces foreign keys and quantity constraints', () => {
    const { path, handle } = fixture(); seedDatabase(path);
    expect(() => handle.sqlite.prepare("INSERT INTO order_items(order_id,product_id,name,unit_price_minor,quantity) VALUES ('missing','espresso','Espresso',1500,1)").run()).toThrow();
    handle.sqlite.prepare("INSERT INTO orders(id,total_minor,currency,created_at) VALUES ('order',1500,'GTQ','2026-01-01T00:00:00.000Z')").run();
    expect(() => handle.sqlite.prepare("INSERT INTO order_items(order_id,product_id,name,unit_price_minor,quantity) VALUES ('order','espresso','Espresso',1500,0)").run()).toThrow();
  });
});
