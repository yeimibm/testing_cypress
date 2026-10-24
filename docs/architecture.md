# Coffee shop architecture

One Express process serves a modular monolith. React talks to its REST API;
SQLite persists the catalog and orders locally. No external runtime services.

## Package responsibilities

| Workspace | Responsibility | Allowed internal imports |
| --- | --- | --- |
| `apps/web` | Spanish catalog, cart, checkout, product forms | `@coffee/shared` |
| `apps/api` | Product/order rules, REST, error handling | `@coffee/shared`, `@coffee/database` |
| `apps/e2e` | Cypress suite and Node-side test tasks | Shared contracts; database testing exports in Node only |
| `packages/shared` | Browser-safe Zod contracts and money display | None |
| `packages/database` | SQLite client, schema, migrations, seed/reset | None |

Packages expose compiled ESM and declaration files through explicit exports.
`workspace:*` binds internal dependencies. Drizzle rows remain private persistence
types; API responses implement shared DTO schemas. Keep product and order queries
beside their API business rules, rather than adding a generic repository layer.

## Order invariants

- Prices use integer centavos. Currency is GTQ; display uses Q with two decimals.
- The browser submits product IDs and quantities; the server calculates totals.
- Quantities are integers from 1 through 99; orders contain 1 through 50 distinct products.
- An order transaction reads products, validates availability and safe totals,
  and inserts the order and items. Failure rolls back every insertion.
- Item names and unit prices are snapshots. Later product changes do not alter receipts.
- Pending checkout prevents simultaneous submissions. Errors preserve the cart;
  retry is explicit. Network-ambiguous retries do not have an idempotency guarantee.

## SQLite lifecycle

Use `better-sqlite3` with Drizzle, foreign keys enabled on every connection, WAL,
and a bounded busy timeout. Paths resolve from a known repository root.
Development uses `.data/development.sqlite`; E2E uses `.data/e2e.sqlite`.
API tests create isolated temporary database files and explicitly close clients.

Apply committed migrations, then seed fixed IDs and prices. Ordinary seed preserves
orders. Explicit reset deletes application rows in foreign-key order and reseeds
within a transaction; it does not delete a file held open by the API. Reset is
restricted to designated development/E2E paths. Isolated UUID-named files under
`.data/tests` are additionally allowed only when both the reset environment and
`NODE_ENV` are `test`. Reset refuses linked/noncanonical parent paths. No public
reset endpoint exists.

`pnpm db:generate` first builds the database package. Drizzle Kit then reads emitted
`dist/schema/*.js`: its CommonJS TypeScript loader cannot directly resolve this
project's NodeNext `.js` imports from source TypeScript. Generated migration SQL,
journal, and snapshots remain committed under `packages/database/migrations`.

## Build and execution

Node 24.22.1 and pnpm 10.32.1 are pinned. Turborepo builds dependencies before
applications and starts long-running development watchers after required builds.
Tests, database mutations, and development tasks are uncached. Vite proxies `/api`
to the local API. Database/native Node code must never reach browser bundles.

The root `pnpm e2e` runner builds packages, resets the dedicated E2E database,
starts an API on 3002 and Vite preview on 4173, and runs headless Cypress. Preview
uses `API_PROXY_TARGET` to select the isolated API; the default remains 3001 for
normal development. Node-side Cypress tasks independently read SQLite and reset
data before each test. The browser specs import only shared contracts.

Occupied E2E ports cause an early failure without stopping their existing owners.
The runner cleans up processes it launched. Windows uses the owned PID tree;
Linux uses owned process groups with bounded TERM grace and KILL escalation.
Cypress receives no inherited `ELECTRON_RUN_AS_NODE`, so Electron-based terminals
cannot accidentally force its browser binary into Node mode.

## Boundaries

Product management is a local form for name, price, and availability. No login,
payments, image generation, file import, deletion workflow, or stock accounting.
Only one currency is supported. Tests and CI use local SQLite rather than services.
