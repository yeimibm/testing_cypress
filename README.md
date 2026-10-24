# Coffee shop ordering prototype


## Requirements

- Node.js 24.22.1 (see `.node-version`)
- pnpm 10.32.1

## Run

From the repository root:

```sh
pnpm install --frozen-lockfile
cp .env.example .env
pnpm build
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open http://localhost:5173. The API listens on http://localhost:3001; Vite
proxies `/api` to it. Development data lives in `.data/development.sqlite`.
Database migrations and seed are explicit; startup never clears orders.

Seed data: Espresso Q15.00, Latte Q22.00, and unavailable Mocha Q25.00.
Create and update products through the product-management form.

On PowerShell, use `Copy-Item .env.example .env` for the copy step.
The API and database commands load the root `.env` through Node's built-in loader.
Shell environment variables take precedence. See `.env.example` for defaults.
Keep the API port at 3001 when using the default Vite proxy.

## Verify

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Unit and integration tests use isolated databases. They do not reset development
data. Check `docs/progress.md` for verification evidence.

## Cypress

```sh
pnpm e2e
pnpm e2e --spec cypress/e2e/successful-order.cy.ts
pnpm e2e --spec cypress/e2e/invalid-order.cy.ts
pnpm e2e --spec cypress/e2e/order-recovery.cy.ts
```

The runner builds prerequisites, migrates/resets `.data/e2e.sqlite`, starts its own
API on port 3002 and Vite preview on 4173, waits for readiness, and runs headless
Electron. Each test resets its own data through a Node task. Both ports must be
free; development servers on 3001/5173 can stay running. The runner stops only its
own processes, including on failure. Run E2E serially against this dedicated database.

Cypress is installed with dependencies; the first installation downloads its local
browser binary. No Cypress Cloud account or external runtime service is used.
Videos and failure screenshots live under `apps/e2e/cypress/{videos,screenshots}`;
server/build/Cypress logs live under `.data/logs/e2e`. These outputs are ignored by Git.
`pnpm test:runner` checks argument handling, port safety, and owned-process cleanup.

## GitHub Actions

The [CI workflow](.github/workflows/ci.yml) runs on pushes to `main`, pull requests,
and manual dispatch in [testing_cypress](https://github.com/yeimibm/testing_cypress).
It installs the pinned Node/pnpm versions and frozen dependencies, then runs lint,
type checks, tests, builds, and `pnpm e2e` on Ubuntu 24.04. The same E2E runner
prepares SQLite and manages servers locally and in CI.

[Verified CI run](https://github.com/yeimibm/testing_cypress/actions/runs/40061416926)
passed on Ubuntu 24.04 for commit `b74285d`: 53 application tests, four runner
tests, and all three Cypress scenarios passed, including Linux process cleanup.

Failed runs retain Cypress screenshots/videos and E2E process logs for seven days
under the run's **Artifacts** section. No database files or environment secrets are
uploaded. See `docs/progress.md` for actual local and GitHub verification results.

## Database changes

```sh
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Review and commit generated migration SQL. To intentionally discard development
orders and restore the deterministic catalog, stop development activity and run:

```sh
pnpm db:reset
```

## Scope and status

This is a local prototype with unprotected product management. It does not include
payments, authentication, images, file imports, or quantity-based inventory.
The prototype, Cypress automation, and GitHub Actions are implemented and verified.
The documented setup also passed from a fresh clone on Windows.

See `docs/architecture.md`, `docs/api-contract.md`, and
`docs/implementation-plan.md` for the design and delivery gates.
