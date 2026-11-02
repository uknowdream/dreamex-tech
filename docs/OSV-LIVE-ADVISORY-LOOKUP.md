# Live SBOM Advisory Lookup

The Supply Chain Intelligence tool can optionally query public package advisories from OSV.dev after the user explicitly starts a scan.

## Data boundary

- Parsing the CycloneDX or SPDX file remains in the browser.
- The browser sends only supported component IDs, package URLs, and versions to the same-origin `/api/osv-scan` endpoint.
- The server calls the fixed OSV.dev API origin. A caller cannot provide an upstream URL.
- A scan request is limited to 100 packages and 64 KiB. The browser processes a maximum of 500 supported packages per scan. Advisory detail enrichment is bounded to 50 IDs per API batch.
- Results reflect public OSV.dev records and package-coordinate matching. Missing findings are not proof that a package is secure. Severity may be marked for review when a source does not expose a recognized rating.
- The endpoint is public and does not require a secret. It should remain size-bounded; if usage grows, add verified edge/server-side rate limiting before increasing scan limits.

## Operational checks

`GET /api/health` returns a small status document that identifies the OSV.dev integration and whether the optional shared workspace has its required configuration, without disclosing secret values.

`npm run test:api` tests input validation, request bounds, the fixed OSV API destination, returned advisory evidence, upstream failure handling, and health-response secrecy. Production smoke checks exercise the health endpoint and verify that the advisory endpoint rejects unsupported methods.
