# Production smoke checks

The production smoke workflow checks the deployed public site independently of the pull-request build. It runs daily and can be started manually from GitHub Actions.

## What it checks

- Homepage and core route shells: `/`, `/api-playground`, `/qa-studio`, `/supply-chain-intelligence`, `/security-center`, `/control-plane`, `/command-center`, and `/roadmap`.
- Public feeds and discovery endpoints: `/rss.xml`, the `/rss` page, and `/sitemap.xml`.
- HTTP success, expected HTML/XML content type, essential shell/feed markers, and HTTPS after redirects.
- A bounded request timeout and one retry for transient network or server errors.

## Run locally

```sh
npm run smoke:production
```

To test a preview or local HTTPS endpoint, set `SMOKE_BASE_URL` to its clean origin (scheme and host only; no path, credentials, query, or fragment). Plain HTTP is intentionally rejected unless `ALLOW_INSECURE_SMOKE=1` is set for a controlled local test.

## Interpretation and limits

- A passing route-shell check confirms HTTP availability and basic response shape. It does not prove React hydration, successful client-side navigation, or that the deployed commit matches the intended commit.
- Playwright desktop/mobile tests remain the evidence for client interactions.
- The script reports the final URL's HTTPS status, not the deployment's Git SHA. Verify production commit identity separately in Vercel before release sign-off.
- Scheduled failures should be triaged against the deployment history and feed configuration; do not suppress a failure merely to turn the workflow green.
