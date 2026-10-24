import {
  OrderSchema, ProductSchema,
  type CreateOrderInput, type CreateProductInput, type Order, type Product,
} from '@coffee/shared';

class RequestError extends Error {}

async function request<T>(
  path: string,
  schema: { parse(value: unknown): T },
  options?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, options);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new RequestError('No pudimos conectar con el servidor. Intenta de nuevo.');
  }
  let body: unknown;
  try { body = await response.json(); }
  catch { throw new RequestError('El servidor no respondió correctamente. Intenta de nuevo.'); }
  if (!response.ok) {
    const error = body as { error?: { message?: unknown } };
    throw new RequestError(typeof error?.error?.message === 'string'
      ? error.error.message : 'No pudimos completar la solicitud. Intenta de nuevo.');
  }
  try { return schema.parse(body); }
  catch { throw new RequestError('La respuesta del servidor no es válida. Intenta de nuevo.'); }
}

export function getProducts(signal?: AbortSignal): Promise<Product[]> {
  return request('/api/products', ProductSchema.array(), { signal });
}

export function postOrder(input: CreateOrderInput): Promise<Order> {
  return request('/api/orders', OrderSchema, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
}

export function saveProduct(input: CreateProductInput, id?: string): Promise<Product> {
  return request(id ? `/api/products/${encodeURIComponent(id)}` : '/api/products', ProductSchema, {
    method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
}

export function errorMessage(error: unknown): string {
  return error instanceof RequestError ? error.message : 'Ocurrió un error. Intenta de nuevo.';
}
