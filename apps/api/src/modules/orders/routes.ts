import { Router } from 'express';
import { CreateOrderSchema } from '@coffee/shared';
import type { DatabaseHandle } from '@coffee/database';
import { HttpError, invalidRequest } from '../../middleware/error-handler.js';
import { createOrder, getOrder } from './service.js';

export function orderRoutes(db: DatabaseHandle): Router {
  const router = Router();
  router.post('/', (request, response) => {
    const parsed = CreateOrderSchema.safeParse(request.body);
    if (!parsed.success) throw invalidRequest();
    response.status(201).json(createOrder(db, parsed.data));
  });
  router.get('/:id', (request, response) => {
    const order = getOrder(db, request.params.id);
    if (!order) throw new HttpError(404, 'ORDER_NOT_FOUND', 'El pedido no existe.');
    response.json(order);
  });
  return router;
}
