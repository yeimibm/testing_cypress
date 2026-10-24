import { describe, expect, it } from 'vitest';
import { addToCart, getCartTotal, validateCart } from './cart-model';

const products = [
  { id: 'espresso', name: 'Espresso', priceMinor: 1500, available: true },
  { id: 'latte', name: 'Latte', priceMinor: 2200, available: true },
  { id: 'mocha', name: 'Mocha', priceMinor: 2500, available: false },
];

describe('cart', () => {
  it('combines the same product and calculates two Espressos plus one Latte in centavos', () => {
    const cart = addToCart(addToCart(addToCart([], 'espresso'), 'espresso'), 'latte');
    expect(cart).toEqual([
      { productId: 'espresso', quantity: '2' },
      { productId: 'latte', quantity: '1' },
    ]);
    expect(getCartTotal(cart, products)).toBe(5200);
    expect(validateCart(cart, products)).toEqual({
      items: [{ productId: 'espresso', quantity: 2 }, { productId: 'latte', quantity: 1 }],
    });
  });

  it.each(['', '0', '-1', '1.5', '100', 'abc'])('rejects an invalid editable quantity: %s', (quantity) => {
    const cart = [{ productId: 'espresso', quantity }];
    expect(() => validateCart(cart, products)).toThrow();
    expect(getCartTotal(cart, products)).toBeNull();
    expect(cart[0]?.quantity).toBe(quantity);
  });

  it('rejects an empty cart and a product that is no longer available', () => {
    expect(() => validateCart([], products)).toThrow('Agrega al menos un producto');
    expect(() => validateCart([{ productId: 'mocha', quantity: '1' }], products)).toThrow('disponible');
    expect(() => validateCart([{ productId: 'missing', quantity: '1' }], products)).toThrow();
  });
});
