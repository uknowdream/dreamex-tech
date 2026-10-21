# DreamEx Tech

Technology blog and engineering documentation built with React, TypeScript, and Vite.

## Local development

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Deployment

Import this repository into Vercel. Use Vite, `npm run build`, and `dist` as the output directory. Add `dreamex.tech` in Project Settings → Domains and follow the exact DNS records shown by Vercel.
## Engineering platform

DreamEx Tech combines editorial knowledge with practical, browser-first engineering tools:

- `/workspace` — searchable engineering tool catalog.
- `/control-plane` — unified engineering launchpad with searchable workflows, browser-session signals, a locally persisted release checklist, and portable JSON snapshots.
- `/engineering-intelligence` — local-first software catalog, JSON import/export, OpenAPI 3.x static analysis, and baseline comparison for likely breaking changes.
- `/lab` — QA utilities, API test matrices, contract review, release scorecards, and incident postmortems.
- `/api-playground` — browser-based HTTP request inspection with local collections and sensitive-header redaction.
- `/observatory` and `/performance` — heuristic page-quality checks and browser timing snapshots.
- `/learn` and `/knowledge-graph` — learning paths, glossary, and curated relationships between concepts and tools.
- `/roadmap` — product roadmap, persistent local progress, release-readiness scorecard, ADR builder, and STRIDE threat-model worksheet.
- `/command-center` — local work queue, incident register, architecture decision records, and release checklist.
- `/qa-studio` — editable test-case tables, BDD/Gherkin scenarios, bug reports, and test plans; supports local draft snapshots and Markdown export.
- `/quality-intelligence` — local-first Playwright JSON and JUnit XML report analysis, pass-rate and duration summaries, retry-based flaky-test signals, failure clustering, report exports, and browser-local summary history.
- `/supply-chain-intelligence` — local-first CycloneDX/SPDX JSON SBOM inventory, dependency and license metadata review, included vulnerability records, and JSON/CSV/Markdown evidence exports. It does not perform a live vulnerability scan.
- `/security-center` — same-origin security-header review, visible document-quality signals, local-storage inventory, JSON/Markdown audit exports, and scoped deletion of DreamEx browser data.
- `/github-ci` — live, read-only status of recent public GitHub Actions runs, sourced from GitHub's public API without a browser token.
- `/team-workspace` — revision-checked shared JSON snapshots over an optional server-side Upstash Redis backend.

Engineering Intelligence starts with clearly labelled example inventory records; replace them with real metadata before using catalog metrics. Catalog data stays in browser storage and can be exported as JSON. OpenAPI contract text is analyzed locally in the browser and is not automatically persisted or sent to a server. Contract comparison is heuristic and does not prove runtime compatibility.

Most existing tool state is stored in the user's browser; no account sync is implied for those tools. The separate Team Workspace route supports an opt-in shared snapshot backend only after server-side Redis and access-token configuration. API Playground requests go directly from the browser to the target and are subject to CORS; do not enter production secrets. Performance snapshots are not a substitute for a full Lighthouse audit. The readiness and STRIDE worksheets are planning aids, not compliance certification or a complete security assessment.

## Validation

```bash
npm run typecheck
npm run lint
npm run build
npm run verify:build
npm run verify:i18n
npm run test:e2e
```

Release discipline: validate CI and desktop/mobile browser regression before treating a change as production-ready, then smoke-test critical routes, sitemap, and the human-readable RSS feed after deployment.

## Shared team workspace setup

The Team Workspace backend remains disabled until its server-side credentials are configured. Create an Upstash Redis REST database and add these variables to the **Vercel Production** environment (never prefix them with `VITE_`):

- `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`).
- `DREAMEX_WORKSPACE_TOKEN`: at least 32 random characters shared only with trusted collaborators.
- Optional `DREAMEX_ALLOWED_ORIGINS`: comma-separated exact origins; defaults to `https://dreamex.tech,https://www.dreamex.tech`.

Redeploy after changing environment variables. The bootstrap owner token can issue per-member access tokens with server-enforced owner/admin/editor/viewer roles. Member tokens are stored as SHA-256 hashes in Redis and the raw token is shown once. Editors can publish snapshots; viewers are read-only; owner/admin control membership with admin escalation restricted to the owner. All authorized members still share one snapshot (maximum 100 KB), so the MVP does not provide per-project tenant isolation or individual actor identity. Owner/admin can inspect a bounded server-side action audit feed that excludes token values and snapshot contents. Use it only for non-sensitive planning data. See [docs/TEAM-WORKSPACE.md](docs/TEAM-WORKSPACE.md).
