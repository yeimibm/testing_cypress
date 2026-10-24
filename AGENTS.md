# Repository instructions

Read `docs/architecture.md` before changing package boundaries, and
`docs/api-contract.md` before changing requests, responses, or validation.
Use `docs/implementation-plan.md` for approved tasks and phase gates.

- Application UI and user-facing errors use Spanish. Code and docs use English.
- Currency is GTQ, displayed as Q; persist integer centavos. The API owns totals.
- Keep browser-safe Zod contracts in `@coffee/shared` and SQLite in `@coffee/database`.
- Applications import packages, never another application's source.
- Persist each order and its item snapshots in one transaction.
- Demonstrate failing behavior tests before implementing logic. Check config directly.
- Verify SQLite persistence and rollback against real isolated databases.
- Preserve cart contents after failed checkout and prevent simultaneous submissions.
- Keep deterministic seed data. Reset only designated development/test databases.
- Use Superpowers for planning, TDD, debugging, and verification; use Matt Pocock
  guidance to refine requirements and module interfaces. Maintain one local plan.
- Stop after functional implementation for approval before building Cypress;
  stop after Cypress for approval before implementing CI.
- Ask one question at a time and wait. Follow explicit user approvals over skill defaults.
- Report commands and actual results in `docs/progress.md`; list unexecuted checks.
- Keep tests and related docs with each behavior change. Use conventional commits
  only when requested; never add AI attribution or Co-Authored-By trailers.
- Do not add Docker, external services, authentication, payments, stock tracking,
  file imports, or images without a scope change.

Before E2E changes, read the test scenarios in the implementation plan. Use
independent data resets, network aliases/assertions, accessible selectors or
`data-cy`, and observable conditions instead of numeric waits.
