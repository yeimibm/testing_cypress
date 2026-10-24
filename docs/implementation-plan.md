# Coffee shop implementation plan

Goal: deliver the approved Spanish ordering prototype with GTQ prices, transactional
SQLite persistence, independent Cypress scenarios, and reproducible local CI.

Design and implementation plan approved. Functional implementation is authorized.
Stage 3, Stage 4, and Stage 5 implementation were explicitly approved. Remote CI
completion requires an actual GitHub Actions result, not only local validation.

## Functional implementation

| Task | Scope | Acceptance | Verification |
| --- | --- | --- | --- |
| 1 | Root workspace, manifests, Turbo, TS, lint | Local imports resolve; dependency builds precede consumers | `pnpm install`, `pnpm build`, `pnpm lint`, `pnpm typecheck` |
| 2 | AGENTS, architecture, API, decisions, plan | Rules match approved scope and GTQ currency | Document review |
| 3 | Shared Zod contracts and money formatting | Invalid payloads rejected; 5200 renders Q52.00 | `pnpm --filter @coffee/shared test` |
| 4 | SQLite schema, migrations, seed/reset | Repeat migration safe; seed retains orders; reset restores fixed data | `pnpm --filter @coffee/database test`, database commands |
| 5 | Catalog API and UI | Fixed prices and availability render; loading/error/retry works | API and web tests |
| 6 | Product forms and REST mutations | Valid create/update persists; invalid input stays recoverable | API and web tests |
| 7 | Cart | Quantity edits/removal work; invalid draft blocks checkout; exact totals | Web tests |
| 8 | Order API | Server-priced transaction persists snapshots; retrieval survives reopen; failures roll back | API integration tests |
| 9 | Checkout and recovery | Receipt ID/total shown; simultaneous clicks blocked; errors retain cart | Web tests, full build and test |

Each logic task runs a failing behavior test, implements the smallest change,
confirms a passing suite, and refactors only while green. Configuration is checked
directly. Track actual results in `progress.md`; check off tasks only after evidence.

- [x] Tasks 1–9: implemented and verified by package tests, root checks, and database
  lifecycle commands recorded in `progress.md`.
- [x] Interactive browser smoke: validation, real order/persistence, product edit,
  receipt snapshots, mobile layout, and console checks recorded in `progress.md`.
- [x] User approval of Stage 3 before starting the Cypress phase.

Seed IDs/prices: espresso=1500, latte=2200, unavailable mocha=2500 centavos.
Two Espressos and one Latte must total 5200/Q52.00. Additional integration cases
cover malformed JSON, unknown IDs, unavailable products, stale client prices,
post-order product edits, duplicate IDs, fractional quantities, and unsafe totals.

## Cypress phase — implemented and verified

Create `scripts/run-e2e.mjs`, Cypress config/support, Node-side database tasks, and
three independent specs under `apps/e2e/cypress/e2e`.

1. Successful order: alias real POST, assert request and 201 response, ID, and 5200
   total; verify persisted data through an independent read and GET.
2. Invalid order: empty cart and invalid quantity errors; assert zero order requests
   after the UI has reached the validation result.
3. Controlled failure: intercept first POST with 503, assert error and retained cart,
   retry against the real API, then verify exactly one persisted order.

Configure baseUrl, accessible/data-cy selectors, and network assertions. Reset the
dedicated E2E database before each test via Node task. Avoid numeric sleeps.
The runner prepares migrations/seed, starts built API and Vite preview, polls
readiness with a timeout, runs Cypress, and cleans processes on Windows/Linux.
Verify each spec independently and the full `pnpm e2e` command.

- [x] Isolated runner, database tasks, and Cypress configuration implemented.
- [x] Successful-order scenario passed independently.
- [x] Invalid-order scenario passed independently.
- [x] Controlled-failure/recovery scenario passed independently.
- [x] Full suite passed: three specs, three tests, no failures.
- [x] Frozen install, lint, typecheck, unit/integration tests, and build passed.
- [x] User approval of Stage 4 before starting GitHub Actions.

Windows execution used Node 24.22.1, pnpm 10.32.1, Cypress 15.4.0, and headless
Electron 138. The Linux-specific cleanup regression was skipped on Windows and
subsequently passed in the Ubuntu CI run below.

## CI phase — implemented and verified

Implement `.github/workflows/ci.yml` only after E2E approval. Install pinned
Node/pnpm and frozen dependencies, run lint/typecheck/tests/build/E2E, and preserve
failure screenshots, configured videos, and server logs. Reuse the local runner.
Verify README commands from a clean checkout and report the actual Actions result;
local inspection alone cannot establish a passing workflow.

- [x] Workflow reuses the local E2E runner on Ubuntu 24.04.
- [x] Failure uploads target screenshots, videos, and logs only.
- [x] Workflow passes actionlint validation.
- [x] README setup and checks pass from a clean checkout.
- [x] Published workflow completes in GitHub Actions, including Linux cleanup test.

The fresh Windows clone passed frozen installation, environment setup, build,
migrations, seed, lint, type checking, application/runner tests, and Cypress.
[GitHub Actions run 40061416926](https://github.com/yeimibm/testing_cypress/actions/runs/40061416926)
passed for commit `b74285df6d0e4797e9d1eb7ddb449937036765a8` on Ubuntu 24.04:
53 application tests, four runner tests without skips, and three Cypress scenarios.
