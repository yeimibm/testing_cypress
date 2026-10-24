import { useCallback, useEffect, useRef, useState } from 'react';
import type { Order, Product } from '@coffee/shared';
import { Catalog } from '../features/catalog/Catalog';
import { Cart } from '../features/cart/Cart';
import { addToCart, validateCart, type CartLine } from '../features/cart/cart-model';
import { OrderConfirmation } from '../features/checkout/OrderConfirmation';
import { ProductManagement } from '../features/product-management/ProductManagement';
import { errorMessage, getProducts, postOrder } from '../lib/api';
import { CoffeeIcon, LeafIcon } from './Icons';

export function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [checkoutError, setCheckoutError] = useState('');
  const [pending, setPending] = useState(false);
  const [order, setOrder] = useState<Order>();
  const [managementOpen, setManagementOpen] = useState(false);
  const submitting = useRef(false);

  const loadCatalog = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setCatalogError('');
    try { setProducts(await getProducts(signal)); }
    catch (cause) {
      if (signal?.aborted) return;
      setCatalogError(`No pudimos cargar el catálogo. ${errorMessage(cause)}`);
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadCatalog(controller.signal);
    return () => controller.abort();
  }, [loadCatalog]);

  function add(productId: string) {
    if (submitting.current) return;
    setCart((current) => addToCart(current, productId)); setCheckoutError(''); setOrder(undefined);
  }

  function productSaved(product: Product) {
    setProducts((current) => current.some((entry) => entry.id === product.id)
      ? current.map((entry) => entry.id === product.id ? product : entry) : [...current, product]);
  }

  async function confirm() {
    if (submitting.current) return;
    let input;
    try { input = validateCart(cart, products); }
    catch (cause) { setCheckoutError(cause instanceof Error ? cause.message : 'Revisa tu pedido.'); return; }
    submitting.current = true; setPending(true); setCheckoutError(''); setOrder(undefined);
    try {
      const savedOrder = await postOrder(input);
      setOrder(savedOrder); setCart([]);
    } catch (cause) { setCheckoutError(errorMessage(cause)); }
    finally { submitting.current = false; setPending(false); }
  }

  return <>
    <header className="site-header"><div className="header-inner">
      <div className="brand"><span className="brand-icon"><CoffeeIcon /></span><div><span className="brand-name">Café de la Casa</span><span className="brand-tagline">Una pausa, un buen café</span></div></div>
      <div className="header-actions"><span className="local-badge"><span className="local-dot" /> Hecho con dedicación</span><button type="button" className="text-button" aria-expanded={managementOpen} aria-controls="product-management" onClick={() => setManagementOpen((open) => !open)}>Administrar productos</button></div>
    </div></header>
    <main className="page">
      <div className="intro"><div><p className="eyebrow">Bienvenido </p><h1>Ordena <em>aquí.</em></h1><p className="intro-copy"> selecciona tu café .</p></div><div className="intro-note"><LeafIcon /><p>café.</p><span>Preparado con cariño, para ti.</span></div></div>
      <div className="ordering-layout">
        <div>{order && <OrderConfirmation order={order} />}
          {loading ? <p role="status" className="loading">Cargando el catálogo…</p> : catalogError ? <section className="catalog-error"><p className="alert" role="alert">{catalogError}</p><button className="secondary-button" type="button" onClick={() => { void loadCatalog(); }}>Reintentar</button></section> : <Catalog products={products} busy={pending} onAdd={add} />}
        </div>
        <Cart lines={cart} products={products} busy={pending} error={checkoutError}
          onChange={(id, quantity) => { setCart((current) => current.map((line) => line.productId === id ? { ...line, quantity } : line)); setCheckoutError(''); }}
          onRemove={(id) => { setCart((current) => current.filter((line) => line.productId !== id)); setCheckoutError(''); }}
          onConfirm={() => { void confirm(); }} />
      </div>
      <div id="product-management">{managementOpen && <ProductManagement products={products} disabled={pending || loading || !!catalogError} onSaved={productSaved} />}</div>
      <footer className="site-footer"><span className="footer-brand">Café de la Casa · </span><span>Precios en quetzales · GTQ</span></footer>
    </main>
  </>;
}
