import { openCatalog } from '../support/order';

describe('Invalid order', () => {
  it('validates an empty cart and invalid quantities without posting', () => {
    const requests: unknown[] = [];
    cy.intercept('POST', '/api/orders', (request) => { requests.push(request.body); }).as('unexpectedOrder');
    openCatalog();
    cy.get('[data-cy="confirm-order"]').click();
    cy.get('[data-cy="checkout-error"]').should('contain.text', 'Agrega al menos un producto');
    cy.then(() => { expect(requests).to.have.length(0); });
    cy.get('button[aria-label="Agregar Espresso"]').click();
    for (const quantity of ['0', '-1', '1.5', '100', '']) {
      cy.get('[data-cy="quantity-espresso"]').clear();
      if (quantity) cy.get('[data-cy="quantity-espresso"]').type(quantity);
      cy.get('[data-cy="confirm-order"]').click();
      cy.get('[data-cy="checkout-error"]').should('contain.text', 'números enteros entre 1 y 99');
      cy.then(() => { expect(requests, `POSTs after quantity ${JSON.stringify(quantity)}`).to.have.length(0); });
    }
    cy.task('db:orderCount').should('equal', 0);
  });
});
