import type { CreateOrderInput, Order } from '@coffee/shared';
import { addSampleOrder, assertReceipt, openCatalog, sampleItems } from '../support/order';

describe('Controlled order failure', () => {
  it('preserves the cart after a 503 and persists exactly one order on retry', () => {
    openCatalog();
    const message = 'No pudimos procesar el pedido. Intenta de nuevo.';
    cy.intercept({ method: 'POST', pathname: '/api/orders', times: 1 }, {
      statusCode: 503, body: { error: { code: 'SERVICE_UNAVAILABLE', message } },
    }).as('failedOrder');
    addSampleOrder();
    cy.get('[data-cy="confirm-order"]').click();
    cy.wait<CreateOrderInput>('@failedOrder').then(({ request, response }) => {
      expect(request.body).to.deep.equal({ items: sampleItems });
      expect(response?.statusCode).to.equal(503);
      expect(response?.body.error.message).to.equal(message);
    });
    cy.get('[data-cy="checkout-error"]').should('have.text', message);
    cy.get('[data-cy="quantity-espresso"]').should('have.value', '2');
    cy.get('[data-cy="quantity-latte"]').should('have.value', '1');
    cy.get('[data-cy="cart-total"]').should('have.text', 'Q52.00');
    cy.task('db:orderCount').should('equal', 0);
    cy.intercept('POST', '/api/orders').as('recoveredOrder');
    cy.get('[data-cy="confirm-order"]').should('be.enabled').click();
    cy.wait<CreateOrderInput, Order>('@recoveredOrder').then(({ request, response }) => {
      expect(request.body).to.deep.equal({ items: sampleItems });
      expect(response?.statusCode).to.equal(201);
      expect(response?.body.totalMinor).to.equal(5200);
      assertReceipt(response!.body.id);
      cy.task('db:order', response!.body.id).its('totalMinor').should('equal', 5200);
      cy.task('db:orderCount').should('equal', 1);
    });
    cy.get('[data-cy="checkout-error"]').should('not.exist');
  });
});
