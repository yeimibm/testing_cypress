import { sql } from 'drizzle-orm';
import { check, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { products } from './products.js';
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  totalMinor: integer('total_minor').notNull(),
  currency: text('currency').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  check('orders_total_check', sql`typeof(${table.totalMinor}) = 'integer' AND ${table.totalMinor} BETWEEN 1 AND 4950000000000`),
  check('orders_currency_check', sql`${table.currency} = 'GTQ'`),
]);
export const orderItems = sqliteTable('order_items', {
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  unitPriceMinor: integer('unit_price_minor').notNull(),
  quantity: integer('quantity').notNull(),
}, (table) => [
  primaryKey({ columns: [table.orderId, table.productId] }),
  check('items_quantity_check', sql`typeof(${table.quantity}) = 'integer' AND ${table.quantity} BETWEEN 1 AND 99`),
  check('items_price_check', sql`typeof(${table.unitPriceMinor}) = 'integer' AND ${table.unitPriceMinor} BETWEEN 1 AND 1000000000`),
]);
