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

## Security model and limitations

This first shared-workspace implementation is a **single shared snapshot behind one shared secret**, not full multi-user authentication. Every holder has read/write access to the same record; there are no per-user roles, tenant separation, server-side audit history, or automatic backups. Rotate the shared token when collaborators change. Do not store passwords, API keys, personal data, customer payloads, or confidential incident details. Set and verify Redis backup/retention policies separately.

The GitHub CI activity page is a separate read-only integration to the public GitHub Actions REST endpoint for this public repository. It does not need a GitHub token, cannot read private repositories, and is subject to GitHub's unauthenticated API rate limits.
