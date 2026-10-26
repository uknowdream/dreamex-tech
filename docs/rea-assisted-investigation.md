# REA-assisted website investigation

DreamEx Tech uses React, TypeScript, Vite, and Playwright. Keep REA as an optional **local investigation tool**, not a runtime dependency of the website and not a production server feature.

## When to use it

Use [morluto/rea](https://github.com/morluto/rea) when a UI or runtime issue cannot be explained from the source and existing tests alone. Its browser workflow can gather page structure, script/resource metadata, selected network observations, and screenshots with evidence. It complements source inspection and Playwright; it does not replace deterministic regression tests.

## Safe workflow

1. Reproduce the issue in a local development or preview build first.
2. Review the current source and existing Playwright coverage before reverse engineering anything.
3. If browser observation is needed, use a dedicated Chrome-family profile and a loopback-only debugging endpoint. Approve only the exact DreamEx origin being investigated.
4. Do not expose a remote-debugging port to a LAN or the public internet. Do not inspect unrelated pages, accounts, or applications without authorization.
5. Treat captured request metadata and page evidence as potentially sensitive. Never commit cookies, authorization headers, user data, HAR captures, tokens, or unredacted storage exports.
6. Convert confirmed findings into a focused code change and a Playwright regression test. Run the repository's normal quality checks before merging.
7. Re-test desktop and mobile layouts, then run the production smoke check after deployment.

## Setup reference

Follow the official [REA installation guide](https://github.com/morluto/rea/blob/main/docs/installation.md) and review the exact setup plan before allowing it to modify local agent configuration. The upstream project documents `npx rea-agents setup`; Node.js/npm requirements and supported workflows can change, so verify them against the current guide.

## DreamEx regression commands

```bash
npm run typecheck
npm run lint
npm run build
npm run verify:build
npm run verify:i18n
npm run verify:security
npm run test:api
npm run test:e2e
npm run smoke:production
```

The expanded responsive regression suite checks the product's documented engineering routes at common mobile, tablet, and desktop widths. If it fails, fix the underlying layout rather than hiding the overflow globally with `overflow-x: hidden`.
