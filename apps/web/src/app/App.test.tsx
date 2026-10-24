import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const products = [
  { id: 'espresso', name: 'Espresso', priceMinor: 1500, available: true },
  { id: 'latte', name: 'Latte', priceMinor: 2200, available: true },
  { id: 'mocha', name: 'Mocha', priceMinor: 2500, available: false },
];
const order = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  items: [{ productId: 'espresso', name: 'Espresso', unitPriceMinor: 1500, quantity: 2 },
    { productId: 'latte', name: 'Latte', unitPriceMinor: 2200, quantity: 1 }],
  totalMinor: 5200,
  currency: 'GTQ',
  createdAt: '2026-10-23T12:00:00.000Z',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(async () => json(products));
});

async function openCatalog() {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('button', { name: 'Agregar Espresso' });
  return user;
}

async function fillCart(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Agregar Espresso' }));
  await user.click(screen.getByRole('button', { name: 'Agregar Espresso' }));
  await user.click(screen.getByRole('button', { name: 'Agregar Latte' }));
}

describe('ordering', () => {
  it('loads the catalog, shows quetzales, and prevents adding unavailable products', async () => {
    render(<App />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando el catálogo');
    await screen.findByRole('button', { name: 'Agregar Espresso' });
    expect(screen.getByText('Q15.00')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Agregar Mocha' })).toBeDisabled();
    expect(screen.getByText('No disponible')).toBeVisible();
  });

  it('recovers from a failed catalog request', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('catálogo');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('button', { name: 'Agregar Espresso' })).toBeVisible();
  });

  it('validates an empty cart and invalid quantities without sending an order', async () => {
    const user = await openCatalog();
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Agrega al menos un producto');
    await user.click(screen.getByRole('button', { name: 'Agregar Espresso' }));
    for (const quantity of ['0', '-1', '1.5', '100', '']) {
      fireEvent.change(screen.getByRole('spinbutton', { name: 'Cantidad de Espresso' }), { target: { value: quantity } });
      await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
      expect(screen.getByRole('alert')).toHaveTextContent('cantidades');
    }
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0);
  });

  it('sends only IDs and quantities, then shows the persisted order ID and authoritative total', async () => {
    const user = await openCatalog();
    await fillCart(user);
    expect(screen.getByTestId('cart-total')).toHaveTextContent('Q52.00');
    fetchMock.mockResolvedValueOnce(json(order, 201));
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    expect(await screen.findByText(order.id)).toBeVisible();
    expect(screen.getByTestId('order-total')).toHaveTextContent('Q52.00');
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(post?.[0]).toBe('/api/orders');
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ items: [
      { productId: 'espresso', quantity: 2 }, { productId: 'latte', quantity: 1 },
    ] });
    expect(screen.getByText('Tu carrito está vacío')).toBeVisible();
  });

  it('preserves the cart on failure and recovers on an explicit retry', async () => {
    const user = await openCatalog();
    await fillCart(user);
    fetchMock.mockResolvedValueOnce(json({ error: { code: 'UNAVAILABLE', message: 'No pudimos confirmar tu pedido. Intenta de nuevo.' } }, 503));
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos confirmar');
    expect(screen.getByRole('spinbutton', { name: 'Cantidad de Espresso' })).toHaveValue(2);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
    fetchMock.mockResolvedValueOnce(json(order, 201));
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    expect(await screen.findByText(order.id)).toBeVisible();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(2);
  });

  it('blocks repeated confirmation while a request is pending', async () => {
    const user = await openCatalog();
    await fillCart(user);
    let resolveOrder: ((response: Response) => void) | undefined;
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveOrder = resolve; }));
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    expect(screen.getByRole('button', { name: 'Confirmando pedido…' })).toBeDisabled();
    expect(screen.getByRole('spinbutton', { name: 'Cantidad de Espresso' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Confirmando pedido…' }));
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
    await act(async () => resolveOrder?.(json(order, 201)));
    expect(await screen.findByText(order.id)).toBeVisible();
  });

  it('displays the total confirmed by the API when catalog prices changed before confirmation', async () => {
    const user = await openCatalog();
    await fillCart(user);
    expect(screen.getByTestId('cart-total')).toHaveTextContent('Q52.00');
    fetchMock.mockResolvedValueOnce(json({ ...order, items: [
      { ...order.items[0], unitPriceMinor: 1550 }, order.items[1],
    ], totalMinor: 5300 }, 201));
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    expect(await screen.findByTestId('order-total')).toHaveTextContent('Q53.00');
  });
});

describe('product management', () => {
  it('creates a product with an exact centavo price and updates the catalog', async () => {
    const user = await openCatalog();
    await user.click(screen.getByRole('button', { name: 'Administrar productos' }));
    const form = screen.getByRole('form', { name: 'Producto' });
    await user.type(within(form).getByLabelText('Nombre'), 'Café filtrado');
    await user.type(within(form).getByLabelText('Precio (Q)'), '15.29');
    fetchMock.mockResolvedValueOnce(json({ id: 'filtrado', name: 'Café filtrado', priceMinor: 1529, available: true }, 201));
    await user.click(within(form).getByRole('button', { name: 'Guardar producto' }));
    expect(await screen.findByRole('button', { name: 'Agregar Café filtrado' })).toBeVisible();
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ name: 'Café filtrado', priceMinor: 1529, available: true });
  });

  it('edits product price and availability and retains form input after a save error', async () => {
    const user = await openCatalog();
    await user.click(screen.getByRole('button', { name: 'Administrar productos' }));
    await user.click(screen.getByRole('button', { name: 'Editar Espresso' }));
    const form = screen.getByRole('form', { name: 'Producto' });
    await user.clear(within(form).getByLabelText('Precio (Q)'));
    await user.type(within(form).getByLabelText('Precio (Q)'), '16.50');
    await user.click(within(form).getByLabelText('Disponible para pedidos'));
    fetchMock.mockResolvedValueOnce(json({ error: { code: 'INTERNAL_ERROR', message: 'No se pudo guardar el producto.' } }, 500));
    await user.click(within(form).getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar');
    expect(within(form).getByLabelText('Precio (Q)')).toHaveValue('16.50');
    fetchMock.mockResolvedValueOnce(json({ ...products[0], priceMinor: 1650, available: false }));
    await user.click(within(form).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Agregar Espresso' })).toBeDisabled());
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(patch?.[0]).toBe('/api/products/espresso');
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ name: 'Espresso', priceMinor: 1650, available: false });
  });

  it('prevents invalid product submission from reaching the API', async () => {
    const user = await openCatalog();
    await user.click(screen.getByRole('button', { name: 'Administrar productos' }));
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }));
    expect(screen.getByRole('alert')).toHaveTextContent('nombre');
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0);
  });
});
