import { formatMoney, type Order } from '@coffee/shared';

export function OrderConfirmation({ order }: { order: Order }) {
  return <section className="receipt" role="status" aria-labelledby="order-success-heading" data-cy="order-success">
    <span className="receipt-icon" aria-hidden="true">✓</span>
    <h2 id="order-success-heading">¡Pedido confirmado!</h2>
    <p>Gracias por elegirnos. Tu pedido quedó registrado.</p>
    <dl><dt>Número de pedido</dt><dd data-cy="order-id">{order.id}</dd><dt>Total confirmado</dt><dd className="receipt-total" data-testid="order-total" data-cy="order-total">{formatMoney(order.totalMinor)}</dd></dl>
  </section>;
}
