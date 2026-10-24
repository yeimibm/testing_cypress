# Verification ledger

Stages 3 and 4 are implemented and verified. Cypress is ready for phase review;
Stage 5 (GitHub Actions) remains unimplemented pending approval.

## Setup evidence

| Command or check | Actual result |
| --- | --- |
| `node --version` (initial host) | v22.15.0; below the pinned project runtime |
| `pnpm --version` | 10.32.1 |
| `pnpm dlx node@24.22.1 --version` | Exit 0, v24.22.1; cached locally without changing system Node |
| `pnpm install` with cached Node 24 on PATH | Exit 0; 408 packages installed; retryable registry timeouts recovered |
| `pnpm exec turbo run build --dry=json` | Exit 0; dependency graph builds shared/database before API and shared before web |
| `pnpm --filter @coffee/database exec node --input-type=module -e "import Database from 'better-sqlite3'; const db = new Database(':memory:'); console.log(JSON.stringify(db.prepare('select 1 as ready').get())); db.close();"` | Exit 0; native SQLite returned `{"ready":1}` |
| `pnpm exec eslint eslint.config.mjs` | Exit 0 |

## Implementation evidence

Reported by the owning backend agent, using Node 24:

| Package | Actual result |
| --- | --- |
| `@coffee/shared` | 12 behavior tests demonstrated RED, then GREEN |
| `@coffee/database` | Initial 4 lifecycle tests demonstrated RED, then GREEN; 3 reset regressions added later |
| `@coffee/api` | 16 behavior tests demonstrated RED, then GREEN; persistence check includes new HTTP app after reopen |

The frontend owner reported behavior-test RED steps followed by GREEN results.
On Windows, files named `Cart.tsx` and `cart.ts` collided on a case-insensitive
filesystem. The model is now `cart-model.ts`, keeping distinct portable paths.
Frontend TypeScript is aligned to the workspace version, 5.9.3.
`pnpm install --prefer-offline` completed with exit 0 after that manifest change;
the lockfile is refreshed and one duplicate TypeScript installation was removed.

The API and database scripts now load root `.env` with Node's built-in loader;
the README copy step reflects this. Root ESLint permits deliberately unused
underscore-prefixed parameters, including Express's required error-handler slots.
Reset regressions cover restoration through an existing connection, transaction
rollback on seed failure, and guarded isolated test paths. Restoration and rollback
were characterization tests that passed on first execution, not new RED claims.

## Integrated verification

All commands below used Node 24.22.1 and pnpm 10.32.1:

| Command | Actual result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Exit 0; lockfile up to date; already installed |
| `pnpm lint` | Exit 0; 4 package lint tasks successful |
| `pnpm typecheck` | Exit 0; 4 typechecks and 2 prerequisite builds successful |
| `pnpm test` | Exit 0; 53 tests passed: shared 12, database 7, API 16, web 18; all test tasks executed uncached |
| `pnpm build` | Exit 0; 4 successful builds, 2 dependency cache hits; API compiled and Vite emitted production assets |
| `pnpm db:migrate` | Exit 0; root `.data/development.sqlite` migrated |
| `pnpm db:seed` (twice) | Both exit 0; repeat seed accepted |
| `pnpm db:reset` | Exit 0; designated development data restored |
| `pnpm db:generate` | Exit 0; 3 tables; no schema changes, nothing to migrate |
| `pnpm exec turbo run dev --filter=@coffee/api --dry=json` with explicit config variables | Exit 0; strict-mode API task retained configured DATABASE_PATH, NODE_ENV, and PORT (3 values) |

After reset, a direct SQLite read confirmed exactly Espresso 1500/available,
Latte 2200/available, Mocha 2500/unavailable, and zero orders. A config check run
from `apps/api` resolved the same root database and accepted explicit port 3055.
Lint was rerun after final test edits and passed all 4 package tasks.

An independent static review of API/frontend found no remaining scoped defects.
It did not rerun tests. Earlier findings requested explicit price-cap documentation,
reset success/atomicity coverage and isolation, and HTTP retrieval after reopening
the database; owners addressed those before the final suite.

## Running local application

Hidden Node 24 processes were started after checks, with logs in `.data/logs`:

- API: PID 23684, `http://127.0.0.1:3001`.
- Frontend: PID 2320, `http://127.0.0.1:5173`.
- PID snapshot: `.data/server-pids.json` (ignored, local only).
- HTTP smoke: API health returned `{"status":"ok"}`, frontend returned 200, and
  frontend `/api/products` proxy returned the three seed products.

These are temporary session processes, not committed startup infrastructure.

## Interactive browser smoke

The primary agent performed these manual browser checks through Playwright tools.
They are smoke checks, not the planned Cypress suite:

| Check | Actual result |
| --- | --- |
| Confirm empty cart | Visible Spanish validation alert; zero order POSTs |
| Confirm Espresso with quantity 0 | Visible Spanish validation alert; zero order POSTs |
| Confirm 2 Espressos and 1 Latte | POST contained only product IDs and quantities; persisted UUID and Q52.00 confirmation displayed |
| Retrieve receipt by HTTP | GET returned 200 with the same ID, 5200 centavos, GTQ, and item snapshots |
| Edit Espresso price to Q15.25 | API stored 1525; previous receipt remained 5200 with Espresso snapshot 1500 |
| Restore Espresso price | API confirmed 1500; catalog returned to seed prices |
| Mobile layout at 390 × 844 | Client and scroll width both 375; controls remained within viewport |
| Fresh navigation after favicon fix | Zero console errors and warnings |

Order `2e2a9c56-7ad2-4672-b663-96ff5015ec05` remains as local sample data.
An independent SQL read under Node 24 confirmed its total 5200/GTQ, Espresso
1500 × 2, Latte 2200 × 1, and current Espresso catalog price 1500. No reset was
performed after this browser sample order.

Screenshots are local ignored artifacts: `.data/stage3-desktop.png` and
`.data/stage3-mobile.png`. Browser-generated traces/snapshots under
`.playwright-mcp/` are also ignored.

The browser exposed a missing favicon request. The frontend owner added an inline
SVG favicon in `apps/web/index.html` and reran the web build successfully. No logic
changed after the 53-test run, so the full suite was not repeated for that HTML edit.

Drizzle Kit's CommonJS schema loader could not resolve NodeNext `.js` imports
directly from TypeScript schema files. The database generation command builds the
package first, then points Drizzle Kit at `dist/schema/*.js`. Generated SQL,
migration journal, and snapshot are real Drizzle artifacts rather than hand-written
stand-ins. Runtime migration continues to read committed migration files.

The cached Node executable used in this session is located under
`C:/Users/yeimi/AppData/Local/pnpm-cache/dlx/` inside
`node@24.22.1/node_modules/node/bin/node.exe`. Prepend its directory to the shell
PATH for install and execution, or install/select the version in `.node-version`
with your normal runtime manager. Native SQLite must run under the same Node
major version used to build it.

## Method adaptations

- The workspace initially contained no files and no Git repository. No worktree,
  Git initialization, or commits have been performed.
- Disjoint ownership separates root/docs, backend/packages, and frontend writes.
- Explicit phase approval takes precedence over skill defaults to execute all work.
- Superpowers brainstorming, writing-plans, TDD, systematic-debugging,
  verification, and subagent-driven-development skills were installed with the
  approved skill installer.
- Matt Pocock codebase-design, grilling, and writing-for-agents installed after
  retrying a network timeout. Installed skills are available on the next turn.
- Engram is unavailable; this ledger preserves repository-local evidence.
- Install reported unsupported ESLint 9 and deprecated transitive dependencies.
  Versions remain pinned to the verified compatible tooling set; no upgrade was
  performed merely to remove warnings.

## Handoff and remaining work

- Stage 3: implemented, reviewed, verified, and approved.
- Stage 4: implemented, verified, and approved.
- Stage 5: workflow implemented and locally validated; remote execution remains pending.
- Keep the current local servers running for user review. Future sessions should
  restart them using the README rather than relying on recorded PIDs.
- No Git initialization or commits were performed. Engram session-summary tools
  are unavailable; this file serves as the local handoff record.

## Stage 4 — Cypress automation

The user approved Cypress implementation after identifying
`https://github.com/yeimibm/testing_cypress` as the future CI repository. No remote
writes, Git initialization, commits, or GitHub Actions configuration were performed.

Implemented three independent specs, reset-before-each Node database tasks,
headless Cypress configuration, and `pnpm e2e` orchestration. E2E uses API 3002,
preview 4173, and `.data/e2e.sqlite`; the running development API/database remain
separate. Tasks read raw SQLite rows independently of the REST API. Browser specs
import shared types only. `API_PROXY_TARGET` selects the preview API without
changing the development default.

All commands used Node 24.22.1 and pnpm 10.32.1 on Windows:

| Command | Actual result |
| --- | --- |
| `pnpm install` | Exit 0; Cypress 15.4.0 dependency and browser binary installed |
| `pnpm install --frozen-lockfile` | Exit 0; lockfile up to date |
| `pnpm lint` | Exit 0; five package tasks plus runner script lint |
| `pnpm typecheck` | Exit 0; five package typechecks plus prerequisite builds |
| `pnpm test` | Exit 0; 53 existing tests plus three runner tests passed; one Linux-only runner test skipped |
| `pnpm build` | Exit 0; five package build tasks successful |
| `pnpm e2e --spec cypress/e2e/successful-order.cy.ts` | Exit 0; 1 passed, no failures |
| `pnpm e2e --spec cypress/e2e/invalid-order.cy.ts` | Exit 0; 1 passed, no failures |
| `pnpm e2e --spec cypress/e2e/order-recovery.cy.ts` | Exit 0; 1 passed, no failures |
| `pnpm e2e` | Exit 0; 3 specs / 3 tests passed, no failures |

Cypress used Electron 138 headless. The successful scenario asserts the request
contains only IDs/quantities, a 201 response with UUID/GTQ/5200, visible Q52.00,
independent SQLite snapshots, and a matching GET receipt. Invalid validation covers
empty cart and quantities `0`, `-1`, `1.5`, `100`, and blank; each settled validation
result has zero intercepted POSTs and no persisted orders. Recovery intercepts the
first POST with 503, verifies the error/cart, then sends a real retry and verifies
exactly one persisted order.

Runner tests first failed on three actual assertions against minimal stubs, then
passed after implementation: unsupported/missing options, occupied-port
preservation, and owned-child cleanup. Existing application E2E scenarios passed
after infrastructure fixes; no fabricated application RED result is claimed.

Initial infrastructure runs exposed two real environment issues:

- The installed standalone pnpm exposes an executable `.exe` through
  `npm_execpath`, rather than a JavaScript entrypoint. The runner now executes that
  binary directly and uses Node for JavaScript package-manager entrypoints.
- This terminal inherits `ELECTRON_RUN_AS_NODE=1`, which caused Cypress's binary to
  reject `--smoke-test` and `--ping`. Only the Cypress child's environment removes
  that flag. Cypress then verified and all scenarios ran successfully. Its Node
  event process uses the launching Node 24 runtime, so native SQLite imports worked
  directly; an external database helper was unnecessary.

After both the failed startup and successful suite, E2E ports were closed. The
development servers remained on 3001/5173 with their original PIDs, and the sample
development order was not reset. Windows process-tree cleanup was exercised.
Linux group cleanup handles an exited leader and escalates TERM to KILL after a
bounded grace period; its platform-specific regression remains unexecuted here.

Individual run logs are `.data/logs/stage4-{success,invalid,recovery}.log`; the full
suite log is `.data/logs/stage4-full.log`. Current service/build/Cypress logs are
under `.data/logs/e2e`, videos under `apps/e2e/cypress/videos`, and failure
screenshots are configured under `apps/e2e/cypress/screenshots`. No test failed
after the infrastructure fixes, so no failure screenshot was generated.

Stage 4 approval was subsequently received. GitHub Actions and Linux execution
verification continue in Stage 5 below. Engram tools remain unavailable; this
ledger is the local session summary and recovery record.

Independent static review passed the Cypress scenarios and final runner changes,
including package-manager dispatch, scoped Electron environment cleanup, process
ownership, and POSIX group cleanup. The reviewer did not rerun unchanged suites.

## Stage 5 — GitHub Actions

The user approved GitHub Actions for `yeimibm/testing_cypress`. The workflow at
`.github/workflows/ci.yml` runs on pushes to `main`, pull requests, and manual
dispatch. It uses Ubuntu 24.04, Node from `.node-version`, pnpm from the root
`packageManager`, and a frozen dependency install. Lint, type checks, tests, build,
and Cypress use the same root commands documented for local execution.

`pnpm e2e` remains the single owner of SQLite preparation, service readiness, and
process cleanup. CI adds no duplicate database/server orchestration. The Linux
cleanup fixture executes through `pnpm test` on the Linux runner.

Failure uploads are limited to Cypress screenshots/videos and `.data/logs/e2e`.
The upload explicitly includes hidden paths so `.data` logs are retained, without
uploading database files or `.env`. Artifacts expire after seven days. Workflow
permissions are limited to reading repository contents; jobs have a 25-minute
timeout and older runs on the same ref are cancelled.

Action references were resolved from the upstream GitHub tag APIs and pinned to
commit SHAs. The annotated pnpm v4 tag was dereferenced to its commit before use.

| Local check | Actual result |
| --- | --- |
| actionlint 1.7.12 release download | Archive SHA256 matched the upstream checksum: `6e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9` |
| `.data/tools/actionlint-1.7.12/actionlint.exe -color .github/workflows/ci.yml` | Exit 0; no workflow diagnostics |

The validation tool is stored under ignored `.data/tools`; it adds no application
or workspace dependency. This establishes local workflow syntax/expression
validation only. Clean-checkout command execution and an actual GitHub Actions run
remain pending. No remote passing result is claimed from actionlint alone.
