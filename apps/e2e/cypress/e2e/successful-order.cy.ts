import type { CreateOrderInput, Order } from '@coffee/shared';
import { addSampleOrder, assertReceipt, openCatalog, sampleItems } from '../support/order';

describe('Successful order', () => {
  it('persists the identifier, server total, and price snapshots', () => {
    openCatalog();
    cy.intercept('POST', '/api/orders').as('createOrder');
    addSampleOrder();
    cy.get('[data-cy="confirm-order"]').click();
    cy.wait<CreateOrderInput, Order>('@createOrder').then(({ request, response }) => {
      expect(request.body).to.deep.equal({ items: sampleItems });
      expect(response?.statusCode).to.equal(201);
      const order = response!.body;
      expect(order.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(order.totalMinor).to.equal(5200);
      expect(order.currency).to.equal('GTQ');
      assertReceipt(order.id);
      cy.task('db:order', order.id).should('deep.equal', {
        id: order.id, totalMinor: 5200, currency: 'GTQ', createdAt: order.createdAt,
        items: [
          { productId: 'espresso', name: 'Espresso', unitPriceMinor: 1500, quantity: 2 },
          { productId: 'latte', name: 'Latte', unitPriceMinor: 2200, quantity: 1 },
        ],
      });
      cy.request<Order>(`/api/orders/${order.id}`).then(({ status, body }) => {
        expect(status).to.equal(200);
        expect(body).to.deep.equal(order);
      });
      cy.task('db:orderCount').should('equal', 1);
    });
  });
});
