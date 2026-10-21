# Quality Gates and Release Verification

This document describes what DreamEx Tech verifies automatically and what still requires human review.

## Local validation

Run the same baseline checks used by CI:

```bash
npm install
npm run typecheck
npm run lint
npm run build
npm run verify:build
npm run verify:i18n
npm run verify:security
npm run test:api
npm run test:e2e
npm run test:a11y
```

The end-to-end suite runs on desktop Chromium and a Pixel 7 emulation profile. The dedicated axe-core suite checks five critical routes against WCAG A/AA rule tags and fails on critical-impact findings. It also prints all detected violation groups to CI logs for triage. A passing automated scan is not a WCAG conformance certificate: manual keyboard, focus, zoom/reflow, screen-reader, and assistive-technology checks remain necessary.

## Lighthouse quality trend

The `Lighthouse quality audit` workflow builds the production output, audits the home page and representative engineering tools, and uploads its report as a workflow artifact. Performance, accessibility, best-practice, and SEO score thresholds are currently warnings while a repeatable baseline is established; review the report rather than interpreting a green workflow as a perfect score.

To change a threshold to a blocking gate, first collect stable results across several runs and representative devices. Avoid thresholds based on one noisy run.

## Production verification

The `Production smoke checks` workflow runs after a successful Vercel production deployment and on a daily schedule. It verifies important route responses, page metadata, feed/sitemap content types, security headers, and protected API behavior. The browser regression suite complements the HTTP smoke check; neither replaces monitoring of real-user errors and Core Web Vitals.

The enforcing Content Security Policy is configured in `vercel.json`, alongside a report-only policy for observation. Keep JavaScript execution restricted to same-origin scripts; do not add `unsafe-inline` or `unsafe-eval` to `script-src` to silence a violation. Review third-party scripts, fonts, API destinations, workers, and embedded content before adding new CSP sources.

## Known boundaries that require configuration or manual verification

- The shared Team Workspace is disabled until Upstash Redis REST credentials and the owner bootstrap token are configured as server-side Vercel Production environment variables. It is a single shared snapshot, not per-project tenancy or an identity provider. See [TEAM-WORKSPACE.md](TEAM-WORKSPACE.md).
- GitHub CI Activity reads the public repository API and is subject to unauthenticated rate limits.
- API Playground requests originate in the browser and therefore depend on the target API's CORS policy. Do not enter production secrets or sensitive payloads.
- Supply Chain Intelligence inspects the supplied SBOM and vulnerability records contained in it. It does not query live vulnerability databases or prove that dependencies are safe.
- Engineering Intelligence starts with example records and uses heuristic OpenAPI comparison. Replace example data and validate contracts against real services before using it for release decisions.
- Current language selection changes client-side content and metadata on the same routes. Search-engine-grade multilingual indexing still needs a dedicated locale URL strategy and reciprocal language alternates; do not add misleading `hreflang` links to the same URL.

## Release review checklist

- [ ] Review CI, browser regression, axe report, and Lighthouse report.
- [ ] Confirm the deployment is the intended commit and is marked Ready.
- [ ] Inspect production smoke results for route, CSP, security-header, RSS, sitemap, and API checks.
- [ ] Manually test navigation and form flows at phone, tablet, and desktop widths.
- [ ] Check keyboard-only navigation, focus restoration, zoom/reflow, and a screen reader on the main user journeys.
- [ ] Verify that production integrations are configured and live data is clearly distinguished from examples.
- [ ] Review known limitations and rollback readiness before declaring the release complete.
