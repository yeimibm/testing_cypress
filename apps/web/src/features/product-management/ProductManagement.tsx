import { useState, type FormEvent } from 'react';
import { CreateProductSchema, formatMoney, parsePrice, type Product } from '@coffee/shared';
import { errorMessage, saveProduct } from '../../lib/api';

export function ProductManagement({ products, disabled, onSaved }: {
  products: Product[]; disabled: boolean; onSaved: (product: Product) => void;
}) {
  const [editingId, setEditingId] = useState<string>();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [available, setAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const busy = disabled || saving;

  function reset() {
    setEditingId(undefined); setName(''); setPrice(''); setAvailable(true); setError('');
  }

  function edit(product: Product) {
    setEditingId(product.id); setName(product.name); setPrice(`${Math.floor(product.priceMinor / 100)}.${String(product.priceMinor % 100).padStart(2, '0')}`);
    setAvailable(product.available); setError(''); setSaved('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const priceMinor = parsePrice(price);
    const input = CreateProductSchema.safeParse({ name, priceMinor, available });
    if (!input.success) {
      setError('Revisa el nombre (1 a 100 caracteres) y el precio: debe ser mayor que cero y tener hasta dos decimales.');
      setSaved(''); return;
    }
    setSaving(true); setError(''); setSaved('');
    try {
      const product = await saveProduct(input.data, editingId);
      onSaved(product); reset(); setSaved('Producto guardado. El catálogo ya está actualizado.');
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setSaving(false); }
  }

  return <section className="management" aria-labelledby="management-heading">
    <div className="management-heading"><h2 id="management-heading">Administración de productos</h2><span className="currency-note">Precios en Q</span></div>
    <div className="management-grid">
      <form className="product-form" aria-label="Producto" onSubmit={submit} noValidate>
        <label className="field" htmlFor="product-name">Nombre<input id="product-name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} disabled={busy} autoComplete="off" placeholder="Ej. Café filtrado" /></label>
        <label className="field" htmlFor="product-price">Precio (Q)<input id="product-price" value={price} inputMode="decimal" onChange={(event) => setPrice(event.target.value)} disabled={busy} autoComplete="off" placeholder="15.00" /></label>
        <label className="checkbox-field"><input type="checkbox" checked={available} onChange={(event) => setAvailable(event.target.checked)} disabled={busy} /> Disponible para pedidos</label>
        {error && <p className="alert" role="alert">{error}</p>}
        <div className="form-actions"><button className="primary-button" type="submit" disabled={busy}>{saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Guardar producto'}</button>{editingId && <button className="secondary-button" type="button" onClick={reset} disabled={busy}>Cancelar</button>}</div>
      </form>
      <ul className="management-list">{products.map((product) => <li key={product.id}><div><strong>{product.name}</strong><span>{formatMoney(product.priceMinor)} · {product.available ? 'Disponible' : 'No disponible'}</span></div><button className="secondary-button" type="button" aria-label={`Editar ${product.name}`} onClick={() => edit(product)} disabled={busy}>Editar</button></li>)}</ul>
    </div>
    {saved && <p className="saved-message" role="status">{saved}</p>}
  </section>;
}
