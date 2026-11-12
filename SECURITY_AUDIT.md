# DreamEx Tech — Application & Infrastructure Security Audit

**Audit Date:** 12 November 2026  
**Project:** DreamEx Tech (`https://dreamex.tech` / `https://www.dreamex.tech`)  
**Security Posture:** Hardened Enforcing CSP + HSTS Preload + Timing-Safe Serverless RBAC + Local-First Data Isolation

---

## 1. Executive Security Summary

DreamEx Tech enforces defense-in-depth across its static edge delivery, browser-local engineering tools, and serverless collaboration API (`api/team-workspace.js`). All automated security gates (`npm run verify:security`, `tests/api/team-workspace.test.mjs`, and `tests/e2e/csp-report-only.spec.ts`) pass.

---

## 2. HTTP Security Headers (`vercel.json`)

Verified both statically (`scripts/verify-security-config.mjs`) and against live production (`https://www.dreamex.tech`):

| Header | Configured Policy | Security Protection |
| :--- | :--- | :--- |
| `Content-Security-Policy` | `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline'; connect-src 'self' https:; manifest-src 'self'; worker-src 'self'; upgrade-insecure-requests` | Blocks plugins (`object-src 'none'`), clickjacking (`frame-ancestors 'none'`), base-tag hijacking, and mixed content |
| `Content-Security-Policy-Report-Only` | Staged policy removing `'unsafe-inline'` from `script-src` | Monitors readiness for strict script-src enforcement without breaking JSON-LD/Vite bootstrap |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Enforces HTTPS across apex and all subdomains for 2 years with preload eligibility |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing attacks |
| `X-Frame-Options` | `DENY` | Legacy browser clickjacking defense |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Prevents leaking full path/query URLs on cross-origin navigation |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()` | Disables sensitive browser hardware APIs and ad-tracking topics |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolates browsing context group against cross-origin window attacks |
| `Cross-Origin-Resource-Policy` | `same-origin` | Restricts cross-origin embedding of site resources |

---

## 3. Serverless API Security (`api/team-workspace.js`)

The `/api/team-workspace` endpoint implements 10 distinct security controls verified by 16 unit tests in `tests/api/team-workspace.test.mjs`:

1. **Fail-Closed Unconfigured State (`503`):** When `DREAMEX_WORKSPACE_TOKEN` or Redis credentials are not set, the endpoint returns `503 workspace_not_configured` with `Cache-Control: no-store, max-age=0`.
2. **Strict Origin Allowlist (`403`):** Rejects requests whose `Origin` header is not in `['https://dreamex.tech', 'https://www.dreamex.tech']` (plus `localhost`/`127.0.0.1` only when `NODE_ENV !== 'production'`).
3. **Timing-Safe Owner Token Comparison:** Uses `crypto.timingSafeEqual` on SHA-256 digests (`safeTokenEquals`) so token length or prefix differences cannot be side-channeled.
4. **Zero Plaintext Member Tokens at Rest:** Member tokens (`dmx_...`) are returned once at creation (`tokenVisibleOnce: true`) and stored in Redis exclusively as SHA-256 hex digests (`hashToken`).
5. **Role-Based Access Control (RBAC):**
   - `owner`: Full snapshot read/write, member creation/deletion, admin promotion/revocation, and audit log access.
   - `admin`: Snapshot read/write, `editor`/`viewer` member management, and audit log access (cannot create, modify, or delete `admin` or `owner` roles).
   - `editor`: Snapshot read/write only (`403` on member/audit endpoints).
   - `viewer`: Snapshot read-only (`403 read_only_role` on `PUT`).
6. **Atomic Lua Compare-And-Set & Role Revalidation:**
   - Snapshot updates use a Redis Lua script verifying `currentRevision == expectedRevision` (`409 revision_conflict` on stale writes).
   - Member role mutations and deletions revalidate the acting `admin`'s live status/role inside the Redis Lua script to prevent TOCTOU privilege escalation.
   - Member registry enforces an atomic `100`-member cap (`MAX_MEMBERS = 100`) inside Lua.
7. **Payload Bounds & Input Sanitization (`400` / `413`):**
   - Rejects payloads exceeding `MAX_BODY_BYTES = 100,000` (`413 payload_too_large`), non-JSON bodies, and control characters.
8. **Privacy-Safe Bounded Audit Log:**
   - Records `workspace.updated`, `member.created`, `member.role_updated`, and `member.revoked` in a bounded 200-entry Redis list (`LPUSH` + `LTRIM 0 199`) without ever logging raw tokens or snapshot payloads.

---

## 4. Browser-Side Security & Privacy Controls

1. **API Playground Secret Header Redaction (`src/EngineeringPlatform.tsx`):**
   - Validates URL schemes (`http:` / `https:` only; blocks `file:`, `javascript:`, `data:`) and automatically strips sensitive headers (`Authorization`, `Cookie`, `X-API-Key`, `Token`, `Secret`) before saving requests to `localStorage`.
2. **Safe Regex Execution (`src/App.tsx`):**
   - Caps regex pattern length and test input size in Developer Utilities to prevent catastrophic backtracking DoS in the browser tab.
3. **Scoped Local Data Inventory & Wiping (`src/EngineeringQualitySuite.tsx`):**
   - Security & Privacy Center allows users to inspect, export, and wipe all `dreamex-` prefixed `localStorage` keys without touching unrelated origin storage.

---

## 5. Dependency Vulnerability Audit (`npm audit`)

- **High / Critical Vulnerabilities:** `0` (`npm audit --audit-level=high` exits `0`).
- **Moderate Advisories Tracked:**
  1. `react-router` / `react-router-dom` (`6.28.0`): Moderate advisory (`GHSA-wrjc-x8rr-h8h6` backslash open-redirect in `<Link>`/`useNavigate`, and `GHSA-337j-9hxr-rhxg` SSR hydration `deserializeErrors`).
     - *Exposure Assessment:* **Low / Mitigated.** DreamEx Tech does not use React Router SSR hydration (`deserializeErrors`), and all `<Link>` / `navigate()` targets are static internal paths verified by `scripts/verify-routes.mjs` (never user-supplied redirect query parameters). Upgrading to `react-router-dom@7` is tracked as a planned major-version migration.
  2. `minimatch` (via `@typescript-eslint/*` devDependencies): Build-time linter dependency only; not included in production bundle or serverless runtime (`npm audit --omit=dev` reports `0` minimatch findings).
