# Shared Team Workspace

The /team-workspace UI stores an editable local JSON draft and can publish a shared snapshot through /api/team-workspace once the production environment is configured. Remote persistence is deliberately disabled without server-side credentials.

## Configure the backend

1. Create an Upstash Redis database with the REST API enabled.
2. In Vercel → dreamex-tech → Settings → Environment Variables, set the Production environment:
   - KV_REST_API_URL
   - KV_REST_API_TOKEN
   - DREAMEX_WORKSPACE_TOKEN (at least 32 random characters)
   - Optionally DREAMEX_ALLOWED_ORIGINS with exact comma-separated origins; defaults to https://dreamex.tech and https://www.dreamex.tech.
3. Redeploy the project after saving the variables.
4. Open /team-workspace, enter the workspace token, and connect. Never place Redis credentials or the workspace token in a VITE_ variable.

The API uses an Upstash Redis compare-and-set Lua script so a write with a stale revision returns HTTP 409 instead of silently replacing a newer snapshot. Requests require a bearer token, are constrained to configured origins when an Origin header is present, use Cache-Control: no-store, and limit a snapshot to 100 KB. The browser keeps its token in sessionStorage for the current tab; local drafts are separate from server storage.

## Security model and role-based access

The workspace uses one owner/bootstrap secret from `DREAMEX_WORKSPACE_TOKEN` plus optional per-member bearer tokens. The bootstrap secret has owner permissions and can issue/revoke access. New member tokens are generated with a cryptographically secure random source; the server stores only their SHA-256 hashes in Redis and reveals the raw token once at creation. Never commit or place a member token in a `VITE_*` variable.

- **Owner:** read/write snapshots, issue any non-owner role, change roles, revoke members (including admins).
- **Admin:** read/write snapshots, add editors/viewers, and manage editor/viewer roles; cannot create, demote, or revoke admins.
- **Editor:** read and publish snapshots.
- **Viewer:** read snapshots only; write requests are rejected by the server.

All authorized members still share one workspace snapshot. The MVP does not yet provide per-project/tenant data boundaries, email invitations, server-side action audit history, or automatic backups. Redis roles constrain actions but do not partition projects. Rotate the bootstrap token when ownership changes. Do not store passwords, API keys, personal data, customer payloads, or confidential incident details. Set and verify Redis backup/retention policies separately.

The GitHub CI activity page is a separate read-only integration to the public GitHub Actions REST endpoint for this public repository. It does not need a GitHub token, cannot read private repositories, and is subject to GitHub's unauthenticated API rate limits.
