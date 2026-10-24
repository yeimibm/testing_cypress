import type { ErrorRequestHandler } from 'express';
import type { ApiError } from '@coffee/shared';

export class HttpError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}
export const invalidRequest = () => new HttpError(400, 'VALIDATION_ERROR', 'Revisa los datos de la solicitud.');

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  const parseError = error !== null && typeof error === 'object' && 'type' in error && ['entity.parse.failed', 'entity.too.large'].includes(String(error.type));
  const failure = error instanceof HttpError ? error : parseError ? invalidRequest() : new HttpError(500, 'INTERNAL_ERROR', 'No se pudo completar la solicitud. Intenta nuevamente.');
  if (failure.status === 500) console.error('API request failed:', error);
  const payload: ApiError = { error: { code: failure.code, message: failure.message } };
  response.status(failure.status).json(payload);
};
