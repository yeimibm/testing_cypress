import express, { type Express } from 'express';
import type { DatabaseHandle } from '@coffee/database';
import { errorHandler, HttpError } from './middleware/error-handler.js';
import { productRoutes } from './modules/products/routes.js';
import { orderRoutes } from './modules/orders/routes.js';

export function createApp({ db }: { db: DatabaseHandle }): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.get('/api/health', (_request, response) => {
    db.sqlite.prepare('SELECT id FROM products LIMIT 1').get();
    response.json({ status: 'ok' });
  });
  app.use('/api/products', productRoutes(db));
  app.use('/api/orders', orderRoutes(db));
  app.use((_request, _response) => { throw new HttpError(404, 'NOT_FOUND', 'La ruta solicitada no existe.'); });
  app.use(errorHandler);
  return app;
}
