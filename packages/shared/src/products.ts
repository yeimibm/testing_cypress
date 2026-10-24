import { z } from 'zod';

// This bound also keeps the largest supported order well within safe integer arithmetic.
export const MAX_PRICE_MINOR = 1_000_000_000;
export const PriceSchema = z.number().int().min(1).max(MAX_PRICE_MINOR);
export const CreateProductSchema = z.object({
  name: z.string().trim().min(1).max(100),
  priceMinor: PriceSchema,
  available: z.boolean(),
}).strict();
export const UpdateProductSchema = CreateProductSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Incluye al menos un campo para actualizar.' },
);
export const ProductSchema = CreateProductSchema.extend({ id: z.string().min(1).max(100) });
export type Product = z.infer<typeof ProductSchema>;
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
