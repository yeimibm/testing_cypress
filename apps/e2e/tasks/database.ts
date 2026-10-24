import { createDatabase, resolveDatabasePath } from '@coffee/database';
import { resetTestDatabase } from '@coffee/database/testing';

function withDatabase<T>(read: (sqlite: ReturnType<typeof createDatabase>['sqlite']) => T): T {
  if (process.env.NODE_ENV !== 'test' || process.env.DATABASE_PATH !== '.data/e2e.sqlite') {
    throw new Error('Cypress database tasks require the dedicated E2E database and test runtime.');
  }
  const handle = createDatabase(resolveDatabasePath('.data/e2e.sqlite'));
  try { return read(handle.sqlite); } finally { handle.close(); }
}

export function databaseTasks() {
  return {
    'db:reset'() {
      withDatabase(() => { resetTestDatabase(); });
      return null;
    },
    'db:order'(id: string) {
      return withDatabase((sqlite) => {
        const order = sqlite.prepare('SELECT id, total_minor AS totalMinor, currency, created_at AS createdAt FROM orders WHERE id = ?').get(id);
        if (!order) return null;
        const items = sqlite.prepare('SELECT product_id AS productId, name, unit_price_minor AS unitPriceMinor, quantity FROM order_items WHERE order_id = ? ORDER BY product_id').all(id);
        return { ...order, items };
      });
    },
    'db:orderCount'() {
      return withDatabase((sqlite) => (sqlite.prepare('SELECT count(*) AS count FROM orders').get() as { count: number }).count);
    },
  };
}
