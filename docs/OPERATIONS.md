# DreamEx Tech — Production Operations

This guide covers the security boundary, after-deploy verification, GitHub integration, and the optional persistent cloud workspace. Never commit environment secrets to Git.

## 1. Enforced browser security policy

~~~text
Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none';
  frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https:;
  font-src 'self' data: https://fonts.gstatic.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  script-src 'self'; connect-src 'self' https: wss:; upgrade-insecure-requests
~~~

The policy is enforced at Vercel's edge; it is no longer only a Report-Only header. script-src does not allow inline script execution or unsafe-eval. style-src 'unsafe-inline' remains for compatibility with the current styling layer and should be removed only after a nonce/hash migration has been tested. After release, inspect browser console/CSP violations on the homepage, article pages, API Playground, PWA install flow, and Google Fonts. If any critical UI is blocked, roll back the deployment and fix the policy rather than weakening it blindly.

## 2. Automatic production smoke tests

The Production smoke workflow is triggered by successful GitHub deployment-status events whose environment is Production. It checks critical route responses, prerendered canonical/SEO metadata, RSS, sitemap, manifest and security headers, then opens critical routes in Chromium to detect uncaught page errors and enforced CSP violations. Automated deployment checks use the public `https://www.dreamex.tech` hostname (not the SSO-protected deployment URL). A manual workflow dispatch can check an approved DreamEx or Vercel hostname when that hostname is publicly reachable.

Open GitHub Actions → Production smoke after a deployment. The deployment can be READY while the smoke workflow is still running; treat both statuses as separate release signals. The workflow failure does not automatically roll back the deployment.

Run the same check from a trusted environment with Node.js 22:

~~~bash
npm install
npm run build
SMOKE_BASE_URL=https://www.dreamex.tech npm run smoke:production
~~~

## 3. Enable GitHub sign-in and public repository integration

Create a GitHub OAuth App in GitHub Developer settings:

- Homepage URL: https://dreamex.tech
- Authorization callback URL: https://dreamex.tech/api/auth/github
- The application requests only read:user; it does not request repository write access or private repository access.

Configure the following Production environment variables in Vercel Project → Settings → Environment Variables:

| Variable | Value |
|---|---|
| APP_ORIGIN | https://dreamex.tech (canonical HTTPS origin, without a path) |
| GITHUB_CLIENT_ID | OAuth App client ID |
| GITHUB_CLIENT_SECRET | OAuth App client secret; keep secret |
| SESSION_SECRET | High-entropy random secret, at least 32 characters |
| WORKSPACE_ADMIN_GITHUB_IDS | Comma-separated numeric GitHub user IDs allowed to administer team invitations |

Generate a session secret in a trusted terminal, then enter it directly into Vercel (do not commit it):

~~~bash
openssl rand -base64 48
~~~

The GitHub integration reads public repositories and recent public GitHub Actions runs only. Private repositories and private workflow results are intentionally out of scope. GitHub's public API has rate limits, which are surfaced to the user.

To find a numeric GitHub user ID, open https://api.github.com/users/YOUR_GITHUB_LOGIN and read the integer id property. Do not use a Vercel user ID.

## 4. Enable private snapshots and team collaboration

Create a Vercel KV/Upstash Redis database in the same Vercel account/team, then configure these environment variables for Production:

| Variable | Value |
|---|---|
| KV_REST_API_URL | HTTPS REST endpoint provided by the Redis/KV integration |
| KV_REST_API_TOKEN | Write-capable REST token for that database; keep secret |

Personal snapshot keys are namespaced to the authenticated GitHub user ID. Team snapshots use a separate shared workspace key and are writable only by configured admins/editors; viewers are read-only. Admins configured by WORKSPACE_ADMIN_GITHUB_IDS can create one-use editor/viewer invitations (valid for seven days). Invitations are stored by hash and can be redeemed once. Snapshot writes include an expected version timestamp; conflicting concurrent writes return HTTP 409 instead of silently overwriting a newer snapshot.

Team snapshots accept only the approved collaboration keys: command center, control-plane checklist, roadmap, readiness scorecard, threat model, QA drafts, and reliability incident/metric records. Personal snapshots exclude API Playground collections and sanitize common sensitive fields/credential patterns. This is a guardrail, not a guarantee that arbitrary free-text is secret-free: review the consent notice and never store production secrets, access tokens, customer records, or private incident data in the shared workspace.

Cloud features return an explicit not-configured response when OAuth/KV settings are absent; no user snapshot is uploaded before the relevant API configuration is active. After adding or rotating environment variables, redeploy Production. Then sign in, load a snapshot, and test save/load/merge with a non-sensitive sample before relying on it.

## 5. Data and recovery boundaries

- The cloud API uses HttpOnly, Secure, SameSite=Lax session cookies, an HMAC-signed seven-day session, same-origin checks for mutations, bounded request sizes, per-user personal keys, and server-side role checks.
- GitHub OAuth access tokens are used only to retrieve the profile during sign-in and are not stored in the browser session or KV.
- Cloud snapshot syncing is manual, not real-time collaboration. Snapshot merges can be configured to preserve local values or explicitly overwrite matching local keys. Review the timestamp and author before saving.
- Browser-local data continues to work if OAuth/KV is not configured. Export a local backup before clearing browser data or testing restore workflows.
- Rotate SESSION_SECRET and the KV token if exposed, then redeploy. Rotating the session secret invalidates existing sessions.
