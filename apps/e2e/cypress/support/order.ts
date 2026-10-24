export const sampleItems = [
  { productId: 'espresso', quantity: 2 },
  { productId: 'latte', quantity: 1 },
];

export function openCatalog() {
  cy.intercept('GET', '/api/products').as('catalog');
  cy.visit('/');
  cy.wait('@catalog').its('response.statusCode').should('eq', 200);
  cy.contains('h3', 'Espresso').should('be.visible');
}

export function addSampleOrder() {
  cy.get('button[aria-label="Agregar Espresso"]').click().click();
  cy.get('button[aria-label="Agregar Latte"]').click();
  cy.get('[data-cy="cart-total"]').should('have.text', 'Q52.00');
}

export function assertReceipt(id: string) {
  cy.contains('h2', '¡Pedido confirmado!').should('be.visible');
  cy.get('[data-cy="order-id"]').should('have.text', id);
  cy.get('[data-cy="order-total"]').should('have.text', 'Q52.00');
}
