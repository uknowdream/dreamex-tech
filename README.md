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
- `/security-center` — same-origin security-header review, visible document-quality signals, local-storage inventory, JSON/Markdown audit exports, and scoped deletion of DreamEx browser data.\n- Control Plane account panel — optional GitHub OAuth, public repository/Actions status, private per-user cloud snapshots, and role-scoped shared-team snapshots backed by Vercel KV/Upstash when configured.

Engineering Intelligence starts with clearly labelled example inventory records; replace them with real metadata before using catalog metrics. Catalog data stays in browser storage and can be exported as JSON. OpenAPI contract text is analyzed locally in the browser and is not automatically persisted or sent to a server. Contract comparison is heuristic and does not prove runtime compatibility.

Most workspace state is stored in the user's browser. No account sync is implied. API Playground requests go directly from the browser to the target and are subject to CORS; do not enter production secrets. Performance snapshots are not a substitute for a full Lighthouse audit. The readiness and STRIDE worksheets are planning aids, not compliance certification or a complete security assessment.

## Validation

```bash
npm run typecheck
npm run lint
npm run build
npm run verify:build
npm run verify:i18n
npm run test:e2e
```

Release discipline: validate CI and desktop/mobile browser regression before treating a change as production-ready, then smoke-test critical routes, sitemap, and the human-readable RSS feed after deployment.\n## Production integrations\n\nSee [docs/OPERATIONS.md](docs/OPERATIONS.md) for enforced CSP verification, post-deploy smoke tests, GitHub OAuth, Vercel KV environment setup, snapshot privacy controls, and team invitations. Cloud authentication and persistence are deliberately disabled until the required Vercel environment variables are configured.\n