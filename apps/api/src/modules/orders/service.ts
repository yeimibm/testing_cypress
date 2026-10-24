import { randomUUID } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import { orderItems, orders, products, type DatabaseHandle } from '@coffee/database';
import type { CreateOrderInput, Order, OrderItem } from '@coffee/shared';
import { HttpError } from '../../middleware/error-handler.js';

export function getOrder(handle: DatabaseHandle, id: string): Order | null {
  const order = handle.db.select().from(orders).where(eq(orders.id, id)).get();
  if (!order) return null;
  const items = handle.db.select({ productId: orderItems.productId, name: orderItems.name, unitPriceMinor: orderItems.unitPriceMinor, quantity: orderItems.quantity }).from(orderItems).where(eq(orderItems.orderId, id)).orderBy(asc(orderItems.productId)).all();
  return { ...order, currency: 'GTQ', items };
}

export function create(handle: DatabaseHandle, input: CreateOrderInput): Order {
  return handle.sqlite.transaction(() => {
    const items: OrderItem[] = input.items.map((item) => {
      const product = handle.db.select().from(products).where(eq(products.id, item.productId)).get();
      if (!product) throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Uno de los productos ya no existe.');
      if (!product.available) throw new HttpError(409, 'PRODUCT_UNAVAILABLE', `El producto ${product.name} no está disponible. Actualiza tu carrito.`);
      return { productId: product.id, name: product.name, unitPriceMinor: product.priceMinor, quantity: item.quantity };
    });
    const totalMinor = items.reduce((total, item) => total + item.unitPriceMinor * item.quantity, 0);
    if (!Number.isSafeInteger(totalMinor) || totalMinor <= 0) throw new HttpError(400, 'VALIDATION_ERROR', 'El total del pedido no es válido.');
    const id = randomUUID();
    handle.db.insert(orders).values({ id, totalMinor, currency: 'GTQ', createdAt: new Date().toISOString() }).run();
    handle.db.insert(orderItems).values(items.map((item) => ({ orderId: id, ...item }))).run();
    const order = getOrder(handle, id);
    if (!order) throw new Error('Order was not persisted inside its transaction.');
    return order;
  }).immediate();
}
