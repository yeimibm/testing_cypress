# Reuse the local E2E runner in GitHub Actions

GitHub Actions calls the existing root commands on Ubuntu 24.04. `pnpm e2e`
continues to own migration/seed preparation, service startup, readiness checks,
Cypress execution, and cleanup. Maintaining these steps once keeps local failures
and CI failures reproducible without an additional orchestration dependency.

Node and pnpm versions come from the committed runtime/package-manager settings.
Action revisions are pinned to commits resolved from their upstream release tags.
Dependency installation uses the committed lockfile and the existing native-build
allowlist.

Failed runs upload only Cypress screenshots/videos and E2E process logs. Hidden
log paths are explicitly included; databases and environment files are not
artifact targets. Seven-day retention bounds storage while preserving debugging
evidence. A read-only repository token is sufficient for the workflow.

Workflow lint validates configuration locally. Only an actual GitHub Actions run
can establish Linux execution, including the process-group cleanup regression.
