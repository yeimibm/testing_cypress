import { randomUUID } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import { products, type DatabaseHandle } from '@coffee/database';
import type { CreateProductInput, Product, UpdateProductInput } from '@coffee/shared';
import { HttpError } from '../../middleware/error-handler.js';

export function listProducts(handle: DatabaseHandle): Product[] {
  return handle.db.select().from(products).orderBy(asc(products.name), asc(products.id)).all();
}
export function createProduct(handle: DatabaseHandle, input: CreateProductInput): Product {
  return handle.db.insert(products).values({ id: randomUUID(), ...input }).returning().get();
}
export function updateProduct(handle: DatabaseHandle, id: string, input: UpdateProductInput): Product {
  const updated = handle.db.update(products).set(input).where(eq(products.id, id)).returning().get();
  if (!updated) throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'El producto no existe.');
  return updated;
}
