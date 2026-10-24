import { formatMoney, type Product } from '@coffee/shared';
import { BagIcon, ArrowIcon } from '../../app/Icons';
import { getCartTotal, type CartLine } from './cart-model';

export function Cart({ lines, products, busy, error, onChange, onRemove, onConfirm }: {
  lines: CartLine[]; products: Product[]; busy: boolean; error: string;
  onChange: (id: string, quantity: string) => void; onRemove: (id: string) => void; onConfirm: () => void;
}) {
  const total = getCartTotal(lines, products);
  return <aside className="order-panel" aria-labelledby="cart-heading">
    <div className="order-panel-header"><h2 id="cart-heading"><BagIcon /> Tu pedido</h2><span className="count-badge" aria-label={`${lines.length} productos en el carrito`}>{lines.length}</span></div>
    <div className="cart-content">
      {lines.length === 0 ? <div className="empty-cart"><div className="empty-icon"><BagIcon /></div><p>Tu carrito está vacío</p><span>Un buen café está a un clic de distancia.</span></div>
        : <ul className="cart-items">{lines.map((line) => {
          const product = products.find((entry) => entry.id === line.productId);
          const quantity = Number(line.quantity);
          const valid = line.quantity !== '' && Number.isInteger(quantity) && quantity >= 1 && quantity <= 99;
          const name = product?.name ?? 'Producto no disponible';
          return <li className="cart-item" key={line.productId}>
            <div className="cart-item-top"><span className="cart-item-name">{name}</span><span className="cart-item-subtotal">{valid && product ? formatMoney(product.priceMinor * quantity) : '—'}</span></div>
            <div className="cart-item-controls"><div><input className="quantity-input" type="number" inputMode="numeric" min="1" max="99" step="1" value={line.quantity} aria-label={`Cantidad de ${name}`} aria-invalid={!valid} disabled={busy} onChange={(event) => onChange(line.productId, event.target.value)} data-cy={`quantity-${line.productId}`} /><span className="item-price-note">{product ? `${formatMoney(product.priceMinor)} c/u` : 'No disponible'}</span></div>
              <button type="button" className="remove-button" aria-label={`Quitar ${name}`} disabled={busy} onClick={() => onRemove(line.productId)}>Quitar</button></div>
          </li>;
        })}</ul>}
    </div>
    <div className="order-summary">
      <div className="total-row"><span>Total del pedido</span><strong data-testid="cart-total" data-cy="cart-total">{total === null ? '—' : formatMoney(total)}</strong></div>
      <p className="currency-note">Todos los precios en quetzales (GTQ).</p>
      {error && <p role="alert" className="alert" data-cy="checkout-error">{error}</p>}
      <button type="button" className="primary-button" disabled={busy} onClick={onConfirm} data-cy="confirm-order">{busy ? 'Confirmando pedido…' : 'Confirmar pedido'}<ArrowIcon /></button>
      <p className="order-note"><BagIcon /> Prepararemos tu pedido después de confirmar.</p>
    </div>
  </aside>;
}
