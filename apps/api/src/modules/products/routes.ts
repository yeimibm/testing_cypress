import { Router } from 'express';
import { CreateProductSchema, UpdateProductSchema } from '@coffee/shared';
import type { DatabaseHandle } from '@coffee/database';
import { invalidRequest } from '../../middleware/error-handler.js';
import { createProduct, listProducts, updateProduct } from './service.js';

export function productRoutes(db: DatabaseHandle): Router {
  const router = Router();
  router.get('/', (_request, response) => { response.json(listProducts(db)); });
  router.post('/', (request, response) => {
    const parsed = CreateProductSchema.safeParse(request.body);
    if (!parsed.success) throw invalidRequest();
    response.status(201).json(createProduct(db, parsed.data));
  });
  router.patch('/:id', (request, response) => {
    const parsed = UpdateProductSchema.safeParse(request.body);
    if (!parsed.success) throw invalidRequest();
    response.json(updateProduct(db, request.params.id, parsed.data));
  });
  return router;
}
