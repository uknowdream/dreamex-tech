# DreamEx Tech — Vercel Deployment & Infrastructure Guide

**Project:** DreamEx Tech (`https://dreamex.tech` → `https://www.dreamex.tech`)  
**Vercel Project ID:** `prj_6Vo3Mp7ucTfUfMRBFNmAj9sCDd61`  
**Vercel Team:** `uknowdream's projects` (`team_GwImIlUOGOVjctH2kjwPOzOT`, slug: `uknowdreams-projects`)  
**Connected GitHub Repository:** `https://github.com/uknowdream/dreamex-tech` (`main` branch, GitHub repo ID `1414115542`)

---

## 1. Domain, DNS & TLS Configuration

Verified via Vercel MCP (`list_domains`, `get_domain_project_domains`, `get_records`) and live production smoke checks (`scripts/smoke-production.mjs`):

| Setting | Verified Value | Status |
| :--- | :--- | :--- |
| **Primary Apex Domain** | `dreamex.tech` (`id: QmQPgtn516dVcLvxmmNNpbMb91qysE6AxDwH9FfHkhJJEL`) | Verified (`verified: true`, `configVerifiedAt: 1791708550313`) |
| **Canonical Production Host** | `https://www.dreamex.tech` | `308 Permanent Redirect` from `https://dreamex.tech/*` |
| **Registrar Nameservers** | `cont603385.mercury.orderbox-dns.com` .. `venus.orderbox-dns.com` | External DNS pointing to Vercel via ALIAS/CNAME |
| **Vercel System DNS Records** | `ALIAS` (`@` → `cname.vercel-dns.com.`), `ALIAS` (`*` → `cname.vercel-dns.com.`), `CAA` (`0 issue "pki.goog"`, `"sectigo.com"`, `"letsencrypt.org"`) | Active |
| **TLS / HTTPS** | TLS 1.3 + `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` | Active & Enforced |

---

## 2. Build, Output & Routing Configuration (`vercel.json`)

| Parameter | Configuration | Purpose |
| :--- | :--- | :--- |
| **Framework Preset** | Vite (Static + Serverless Functions) | Compiles React/TS frontend + `/api/*` Node.js functions |
| **Install Command** | `npm ci` (or `npm install`) | Installs locked dependencies from `package-lock.json` |
| **Build Command** | `npm run build` (`node scripts/generate-rss.mjs && tsc -b && vite build && node scripts/prerender-routes.mjs`) | Generates feeds/sitemap, compiles TS, builds bundles, prerenders 30 route HTML files |
| **Output Directory** | `dist` | Contains prerendered `<route>/index.html`, hashed `/assets/*`, `/rss.xml`, `/sitemap.xml` |
| **API Rewrite** | `/api/team-workspace` → `/api/team-workspace.js` | Routes workspace API requests to the serverless function before SPA fallback |
| **SPA Fallback Rewrite** | `/((?!api/).*)` → `/index.html` | Serves client router fallback for unknown paths while static prerendered files take precedence |
| **Cache-Control** | `/api/(.*)` → `no-store, max-age=0`; `/assets/*` → immutable hashed assets | Prevents caching of authenticated API responses while maximizing edge cache hit rates for static bundles |

---

## 3. Environment Variables & Optional Upstash Redis Setup

The public website and all 18 local-first engineering tools run with **zero required environment variables**.

The `/api/team-workspace` endpoint is designed to fail closed with `503 workspace_not_configured` until the following **server-only** environment variables are configured in Vercel Project Settings (`Settings → Environment Variables`, scoped to `Production` and optionally `Preview`):

| Variable Name | Scope | Description |
| :--- | :--- | :--- |
| `DREAMEX_WORKSPACE_TOKEN` | Server-only (`Production`) | High-entropy Owner token (minimum 32 random bytes, e.g., `openssl rand -hex 32`). Never prefix with `VITE_`. |
| `KV_REST_API_URL` (or `UPSTASH_REDIS_REST_URL`) | Server-only (`Production`) | Upstash Redis REST endpoint URL (provisioned via Vercel Marketplace Upstash integration). |
| `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_TOKEN`) | Server-only (`Production`) | Upstash Redis REST bearer token. |
| `DREAMEX_WORKSPACE_KEY` | Optional (`Production`) | Custom Redis key prefix (defaults to `dreamex:team-workspace:v1`). |

> **Security Rule (`scripts/verify-security-config.mjs`):** Never expose `DREAMEX_WORKSPACE_TOKEN`, `KV_REST_API_TOKEN`, or `UPSTASH_REDIS_REST_TOKEN` with a `VITE_` prefix. The build verification gate automatically fails if any `VITE_` secret reference is introduced.

---

## 4. Vercel Plugin / OAuth Permission Scope Note

During automated inspection via the `@[plugin:vercel-plugin]` MCP server:
- **Verified Working Scopes:** `get_auth_user`, `list_teams`, `list_domains`, `get_domain`, `get_domain_project_domains`, `get_records`, `git_namespaces`, and `search_repo` all succeeded and confirmed `dreamex.tech` is attached to project `prj_6Vo3Mp7ucTfUfMRBFNmAj9sCDd61` on team `team_GwImIlUOGOVjctH2kjwPOzOT`.
- **Project-Level Scope Boundary:** Direct project-scoped MCP endpoints (`get_project`, `list_deployments`, `get_runtime_logs`, `filter_project_envs`) returned `404/403` because the Vercel OAuth integration grant on `uknowdream's projects` is currently scoped without explicit project-level access to `prj_6Vo3Mp7ucTfUfMRBFNmAj9sCDd61`.
- **How to Grant Full Project Access (Optional):** In the Vercel Dashboard → **Team Settings (`uknowdream's projects`) → Integrations → Antigravity / Vercel Plugin → Configure**, change Project Access from selected projects to **All Projects** (or explicitly check `dreamex-tech`).

---

## 5. Production Verification & Rollback Procedure

### Post-Deploy Verification
Run the automated 38-point production smoke suite against live production:
```bash
npm run verify:production
# or:
node scripts/smoke-production.mjs
```

### Rollback Procedure
1. **Via Vercel Dashboard / CLI:** Promote the previous known-good `READY` production deployment in **Vercel Dashboard → dreamex-tech → Deployments → Instant Rollback**.
2. **Via Git:** Revert the offending commit on `main` (`git revert <sha> && git push origin main`), which triggers the full GitHub Actions CI/E2E verification and a fresh Vercel production deployment.
