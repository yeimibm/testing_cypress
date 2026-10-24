import { MAX_PRICE_MINOR } from './products.js';

const integerFormatter = new Intl.NumberFormat('es-GT', { maximumFractionDigits: 0 });
export function formatMoney(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) throw new RangeError('Amount must be non-negative integer centavos.');
  return `Q${integerFormatter.format(Math.floor(amountMinor / 100))}.${String(amountMinor % 100).padStart(2, '0')}`;
}
export function parsePrice(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole = '', fraction = ''] = normalized.split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(minor) && minor > 0 && minor <= MAX_PRICE_MINOR ? minor : null;
}
