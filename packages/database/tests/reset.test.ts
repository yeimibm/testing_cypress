import { existsSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase, resetDatabase, resolveDatabasePath, type DatabaseHandle } from '../src/index.js';

let path: string;
let handle: DatabaseHandle | undefined;
let ownsFixture = false;

function fixture(): DatabaseHandle {
  path = resolveDatabasePath(`.data/tests/${randomUUID()}.sqlite`);
  if (existsSync(path)) throw new Error('Refusing to overwrite an existing test database.');
  ownsFixture = true;
  resetDatabase(path, 'test');
  handle = createDatabase(path);
  handle.sqlite.exec("UPDATE products SET price_minor=1700 WHERE id='espresso'; INSERT INTO products(id,name,price_minor,available) VALUES ('custom','Custom',2000,1); INSERT INTO orders(id,total_minor,currency,created_at) VALUES ('old',1700,'GTQ','2026-01-01T00:00:00.000Z'); INSERT INTO order_items(order_id,product_id,name,unit_price_minor,quantity) VALUES ('old','espresso','Espresso',1700,1)");
  return handle;
}
afterEach(() => {
  if (handle?.sqlite.open) handle.close();
  handle = undefined;
  if (ownsFixture) for (const suffix of ['', '-wal', '-shm']) rmSync(`${path}${suffix}`, { force: true });
  ownsFixture = false;
});

describe('deterministic reset', () => {
  it('restores seed rows and preserves migration history through an existing connection', () => {
    const db = fixture();
    const history = db.sqlite.prepare('SELECT hash,created_at FROM __drizzle_migrations ORDER BY id').all();
    resetDatabase(path, 'test');
    expect(db.sqlite.prepare('SELECT id,price_minor,available FROM products ORDER BY id').all()).toEqual([
      { id: 'espresso', price_minor: 1500, available: 1 }, { id: 'latte', price_minor: 2200, available: 1 }, { id: 'mocha', price_minor: 2500, available: 0 },
    ]);
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM orders').get()).toEqual({ count: 0 });
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM order_items').get()).toEqual({ count: 0 });
    expect(db.sqlite.prepare('SELECT hash,created_at FROM __drizzle_migrations ORDER BY id').all()).toEqual(history);
  });
  it('retains previous products, orders, and items if reseeding fails', () => {
    const db = fixture();
    const products = db.sqlite.prepare('SELECT * FROM products ORDER BY id').all();
    const orders = db.sqlite.prepare('SELECT * FROM orders ORDER BY id').all();
    const items = db.sqlite.prepare('SELECT * FROM order_items ORDER BY order_id,product_id').all();
    db.sqlite.exec("CREATE TRIGGER fail_reset_seed BEFORE INSERT ON products WHEN NEW.id='espresso' BEGIN SELECT RAISE(ABORT,'controlled seed failure'); END");
    expect(() => resetDatabase(path, 'test')).toThrow('controlled seed failure');
    expect(db.sqlite.prepare('SELECT * FROM products ORDER BY id').all()).toEqual(products);
    expect(db.sqlite.prepare('SELECT * FROM orders ORDER BY id').all()).toEqual(orders);
    expect(db.sqlite.prepare('SELECT * FROM order_items ORDER BY order_id,product_id').all()).toEqual(items);
  });
  it('requires the test runtime and designated UUID path for isolated test resets', () => {
    expect(() => resetDatabase(resolveDatabasePath('.data/tests/custom.sqlite'), 'test')).toThrow();
    expect(() => resetDatabase(resolveDatabasePath(`.data/${randomUUID()}.sqlite`), 'test')).toThrow();
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try { expect(() => resetDatabase(resolveDatabasePath(`.data/tests/${randomUUID()}.sqlite`), 'test')).toThrow(); }
    finally { if (original === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = original; }
  });
});
