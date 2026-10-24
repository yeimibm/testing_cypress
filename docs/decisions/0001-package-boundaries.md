# Keep transport contracts separate from persistence

Status: accepted with the repository design.

The browser and API share Zod DTO schemas through `@coffee/shared`. Drizzle table
definitions and SQLite clients stay in `@coffee/database`; only server code and
Node-side test tooling may import that package.

This duplicates a small amount of mapping between table rows and DTOs, while
preventing database internals and native modules from entering the browser bundle.
Compiled ESM packages add a build step but give Vite, Node, and Cypress a consistent
runtime contract. Turborepo manages that build ordering.

SQLite transactions own order creation and snapshot prices. One local database
and one API process satisfy prototype scope without operational service overhead.

Product prices are capped at 1,000,000,000 centavos (Q10,000,000.00). Combined
with at most 50 distinct items and quantity 99 per item, this bounds the largest
order at 4,950,000,000,000 centavos, below JavaScript's maximum safe integer.
Zod and SQLite both enforce the price bound. This explicit prototype limit
keeps arithmetic exact; the API also verifies safe totals defensively.

Drizzle Kit reads compiled schema JavaScript after a database-package build.
An actual generation attempt against source TypeScript failed because its CommonJS
loader could not resolve NodeNext `.js` imports. Building first preserves the same
schema source and avoids introducing a second schema or incompatible import rules.
