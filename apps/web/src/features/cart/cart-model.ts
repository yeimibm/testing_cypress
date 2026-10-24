import { CreateOrderSchema, type CreateOrderInput, type Product } from '@coffee/shared';

export type CartLine = { productId: string; quantity: string };

export function addToCart(cart: CartLine[], productId: string): CartLine[] {
  const existing = cart.find((line) => line.productId === productId);
  if (!existing) return [...cart, { productId, quantity: '1' }];
  return cart.map((line) => line.productId === productId
    ? { ...line, quantity: String(Math.min(99, Math.max(1, Number(line.quantity) || 0) + 1)) }
    : line);
}

export function validateCart(cart: CartLine[], products: Product[]): CreateOrderInput {
  if (cart.length === 0) throw new Error('Agrega al menos un producto para confirmar tu pedido.');
  const result = CreateOrderSchema.safeParse({
    items: cart.map((line) => ({ productId: line.productId, quantity: Number(line.quantity) })),
  });
  if (!result.success) throw new Error('Revisa las cantidades: deben ser números enteros entre 1 y 99.');
  for (const item of result.data.items) {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product?.available) throw new Error(`${product?.name ?? 'Este producto'} ya no está disponible. Retíralo del carrito.`);
  }
  return result.data;
}

export function getCartTotal(cart: CartLine[], products: Product[]): number | null {
  if (cart.length === 0) return 0;
  try {
    const { items } = validateCart(cart, products);
    const total = items.reduce((sum, item) => sum + (products.find((product) => product.id === item.productId)?.priceMinor ?? 0) * item.quantity, 0);
    return Number.isSafeInteger(total) ? total : null;
  } catch {
    return null;
  }
}
