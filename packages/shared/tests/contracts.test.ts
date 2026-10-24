import { describe, expect, it } from 'vitest';
import { CreateOrderSchema, CreateProductSchema, UpdateProductSchema, formatMoney, parsePrice } from '../src/index.js';

describe('request validation', () => {
  it('accepts IDs and quantities without accepting client prices', () => {
    expect(CreateOrderSchema.safeParse({ items: [{ productId: 'espresso', quantity: 2 }] }).success).toBe(true);
    expect(CreateOrderSchema.safeParse({ items: [{ productId: 'espresso', quantity: 2, priceMinor: 1 }] }).success).toBe(false);
  });
  it.each([0, -1, 1.5, 100, '2', null])('rejects invalid quantity %s', (quantity) => {
    expect(CreateOrderSchema.safeParse({ items: [{ productId: 'espresso', quantity }] }).success).toBe(false);
  });
  it('rejects empty and duplicate product orders', () => {
    expect(CreateOrderSchema.safeParse({ items: [] }).success).toBe(false);
    expect(CreateOrderSchema.safeParse({ items: [{ productId: 'espresso', quantity: 1 }, { productId: 'espresso', quantity: 1 }] }).success).toBe(false);
  });
  it('rejects more than 50 distinct products', () => {
    expect(CreateOrderSchema.safeParse({ items: Array.from({ length: 51 }, (_, i) => ({ productId: `p-${i}`, quantity: 1 })) }).success).toBe(false);
  });
  it('rejects invalid prices, empty updates, and unexpected product fields', () => {
    for (const priceMinor of [0, -1, 1.5, Number.MAX_SAFE_INTEGER]) {
      expect(CreateProductSchema.safeParse({ name: 'Cafe', priceMinor, available: true }).success).toBe(false);
    }
    expect(CreateProductSchema.safeParse({ name: ' ', priceMinor: 1500, available: true }).success).toBe(false);
    expect(CreateProductSchema.safeParse({ name: 'Cafe', priceMinor: 1500, available: true, id: 'injected' }).success).toBe(false);
    expect(UpdateProductSchema.safeParse({}).success).toBe(false);
    expect(UpdateProductSchema.safeParse({ available: false }).success).toBe(true);
  });
});

describe('money', () => {
  it('formats centavos in quetzales without changing arithmetic', () => {
    expect(formatMoney(5200)).toBe('Q52.00');
    expect(formatMoney(105)).toBe('Q1.05');
    expect(formatMoney(0)).toBe('Q0.00');
  });
  it('parses decimal prices exactly and rejects invalid precision', () => {
    expect(parsePrice('15.10')).toBe(1510);
    expect(parsePrice('15,50')).toBe(1550);
    expect(parsePrice('22')).toBe(2200);
    expect(parsePrice('0.01')).toBe(1);
    for (const value of ['', '0', '-1', '1.001', '1e3', 'Q15', '9007199254740991']) expect(parsePrice(value)).toBeNull();
  });
});
