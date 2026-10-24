import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDatabase, migrateDatabase, seedDatabase, type DatabaseHandle } from '@coffee/database';
import type { Order, Product } from '@coffee/shared';
import { createApp } from '../src/app.js';

let db: DatabaseHandle;
let server: Server;
let directory: string;
let path: string;
let baseUrl: string;
beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), 'coffee-api-'));
  path = join(directory, 'test.sqlite');
  migrateDatabase(path); seedDatabase(path); db = createDatabase(path);
  server = createApp({ db }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address');
  baseUrl = `http://127.0.0.1:${address.port}`;
});
afterEach(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (db?.sqlite.open) db.close();
  if (directory) rmSync(directory, { recursive: true, force: true });
});
function request(route: string, method = 'GET', body?: unknown) {
  return fetch(`${baseUrl}/api${route}`, { method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
}
const validOrder = { items: [{ productId: 'espresso', quantity: 2 }, { productId: 'latte', quantity: 1 }] };

describe('catalog API', () => {
  it('reports database readiness and lists prices and unavailable products', async () => {
    expect((await request('/health')).status).toBe(200);
    const response = await request('/products');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      { id: 'espresso', name: 'Espresso', priceMinor: 1500, available: true },
      { id: 'latte', name: 'Latte', priceMinor: 2200, available: true },
      { id: 'mocha', name: 'Mocha', priceMinor: 2500, available: false },
    ]);
  });
  it('creates and updates a persisted product', async () => {
    const response = await request('/products', 'POST', { name: '  Cortado  ', priceMinor: 1850, available: true });
    expect(response.status).toBe(201);
    const product = await response.json() as Product;
    expect(product).toMatchObject({ name: 'Cortado', priceMinor: 1850, available: true });
    expect(product.id).toMatch(/^[0-9a-f-]{36}$/);
    const update = await request(`/products/${product.id}`, 'PATCH', { priceMinor: 1950, available: false });
    expect(update.status).toBe(200);
    expect(await update.json()).toEqual({ ...product, priceMinor: 1950, available: false });
    expect(db.sqlite.prepare('SELECT price_minor, available FROM products WHERE id=?').get(product.id)).toEqual({ price_minor: 1950, available: 0 });
  });
  it('rejects invalid products and empty patches without changing data', async () => {
    expect((await request('/products', 'POST', { name: ' ', priceMinor: -1, available: true })).status).toBe(400);
    expect((await request('/products/espresso', 'PATCH', {})).status).toBe(400);
    expect((await request('/products/missing', 'PATCH', { name: 'Cafe' })).status).toBe(404);
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM products').get()).toEqual({ count: 3 });
  });
});

describe('orders API', () => {
  it('saves an authoritative GTQ total and retrieves it after reopening SQLite', async () => {
    const response = await request('/orders', 'POST', validOrder);
    expect(response.status).toBe(201);
    const order = await response.json() as Order;
    expect(order).toMatchObject({ totalMinor: 5200, currency: 'GTQ', items: [
      { productId: 'espresso', name: 'Espresso', unitPriceMinor: 1500, quantity: 2 },
      { productId: 'latte', name: 'Latte', unitPriceMinor: 2200, quantity: 1 },
    ] });
    expect(order.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Date(order.createdAt).toISOString()).toBe(order.createdAt);
    const stored = await request(`/orders/${order.id}`);
    expect(stored.status).toBe(200); expect(await stored.json()).toEqual(order);
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    db.close(); db = createDatabase(path);
    server = createApp({ db }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const reopenedAddress = server.address();
    if (!reopenedAddress || typeof reopenedAddress === 'string') throw new Error('Missing reopened test server address');
    baseUrl = `http://127.0.0.1:${reopenedAddress.port}`;
    const reopenedResponse = await request(`/orders/${order.id}`);
    expect(reopenedResponse.status).toBe(200);
    expect(await reopenedResponse.json()).toEqual(order);
    expect(db.sqlite.prepare('SELECT total_minor, currency FROM orders WHERE id=?').get(order.id)).toEqual({ total_minor: 5200, currency: 'GTQ' });
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM order_items WHERE order_id=?').get(order.id)).toEqual({ count: 2 });
  });
  it.each([
    { items: [] },
    { items: [{ productId: 'espresso', quantity: 0 }] },
    { items: [{ productId: 'espresso', quantity: 1.5 }] },
    { items: [{ productId: 'espresso', quantity: 100 }] },
    { items: [{ productId: 'espresso', quantity: 1, priceMinor: 1 }] },
    { items: [{ productId: 'espresso', quantity: 1 }], totalMinor: 1 },
    { items: [{ productId: 'espresso', quantity: 1 }, { productId: 'espresso', quantity: 1 }] },
  ])('rejects invalid order without writing rows: %j', async (body) => {
    const response = await request('/orders', 'POST', body);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM orders').get()).toEqual({ count: 0 });
  });
  it('rejects missing and unavailable products without creating orders', async () => {
    expect((await request('/orders', 'POST', { items: [{ productId: 'missing', quantity: 1 }] })).status).toBe(404);
    expect((await request('/orders', 'POST', { items: [{ productId: 'mocha', quantity: 1 }] })).status).toBe(409);
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM orders').get()).toEqual({ count: 0 });
  });
  it('reads current prices and preserves historical order snapshots', async () => {
    const first = await (await request('/orders', 'POST', validOrder)).json() as Order;
    await request('/products/espresso', 'PATCH', { name: 'Espresso nuevo', priceMinor: 1700 });
    const second = await (await request('/orders', 'POST', validOrder)).json() as Order;
    expect(second.totalMinor).toBe(5600);
    expect(await (await request(`/orders/${first.id}`)).json()).toEqual(first);
    await request('/products/espresso', 'PATCH', { available: false });
    expect((await request('/orders', 'POST', validOrder)).status).toBe(409);
  });
  it('rolls back the order and earlier items when a later insert fails', async () => {
    db.sqlite.exec("CREATE TRIGGER fail_latte BEFORE INSERT ON order_items WHEN NEW.product_id = 'latte' BEGIN SELECT RAISE(ABORT, 'controlled storage failure'); END");
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await request('/orders', 'POST', validOrder);
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'No se pudo completar la solicitud. Intenta nuevamente.' } });
      expect(db.sqlite.prepare('SELECT count(*) AS count FROM orders').get()).toEqual({ count: 0 });
      expect(db.sqlite.prepare('SELECT count(*) AS count FROM order_items').get()).toEqual({ count: 0 });
    } finally { log.mockRestore(); }
  });
  it('returns a consistent missing-order error', async () => {
    const response = await request('/orders/missing');
    expect(response.status).toBe(404); expect(await response.json()).toMatchObject({ error: { code: 'ORDER_NOT_FOUND' } });
  });
  it('rejects malformed JSON as a validation error', async () => {
    const response = await fetch(`${baseUrl}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    expect(response.status).toBe(400); expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });
});
