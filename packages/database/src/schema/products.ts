import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  priceMinor: integer('price_minor').notNull(),
  available: integer('available', { mode: 'boolean' }).notNull(),
}, (table) => [
  check('products_name_check', sql`length(trim(${table.name})) BETWEEN 1 AND 100`),
  check('products_price_check', sql`typeof(${table.priceMinor}) = 'integer' AND ${table.priceMinor} BETWEEN 1 AND 1000000000`),
  check('products_available_check', sql`${table.available} IN (0, 1)`),
]);
