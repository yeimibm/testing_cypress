import { z } from 'zod';
import { PriceSchema } from './products.js';

export const OrderItemInputSchema = z.object({
  productId: z.string().min(1).max(100),
  quantity: z.number().int().min(1).max(99),
}).strict();
export const CreateOrderSchema = z.object({
  items: z.array(OrderItemInputSchema).min(1).max(50).refine(
    (items) => new Set(items.map((item) => item.productId)).size === items.length,
    { message: 'Cada producto debe aparecer una sola vez.' },
  ),
}).strict();
export const OrderItemSchema = OrderItemInputSchema.extend({ name: z.string(), unitPriceMinor: PriceSchema });
export const OrderSchema = z.object({
  id: z.string().uuid(),
  items: z.array(OrderItemSchema).min(1).max(50),
  totalMinor: z.number().int().positive().safe(),
  currency: z.literal('GTQ'),
  createdAt: z.string().datetime(),
}).strict();
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
