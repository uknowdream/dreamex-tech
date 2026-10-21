# Cloud Workspace Sync

Cloud sync is an optional integration. The site deliberately remains usable without it.

## 1. Configure Supabase

1. Create or select a Supabase project.
2. Open the SQL Editor and execute `supabase/migrations/202610220001_workspace_sync.sql`.
3. In Authentication settings, configure email/password sign-in and the confirmation policy appropriate for your users.
4. Set these variables in Vercel **Production, Preview, and Development** as appropriate:
   - `VITE_SUPABASE_URL`: your project's HTTPS URL.
   - `VITE_SUPABASE_ANON_KEY`: the project's public anon/publishable key.
5. Redeploy after setting build-time variables.

**Never** place a Supabase `service_role` key, database password, or other privileged secret in a `VITE_*` variable. Vite embeds `VITE_*` values into browser assets.

## 2. Current integration scope

The Engineering Control Plane supports sign-up/sign-in and cloud save/restore for its release checklist. Auth sessions stay in the current browser tab's session storage and refresh when needed. The personal checklist table is isolated by `auth.uid()` row-level security.

The migration also provisions team membership and shared snapshot tables with owner/admin/editor/viewer policies. Team creation/invitation management UI and cross-tool synchronization are not enabled by the current client; do not describe those capabilities as live until that UI and its flows have been implemented and tested.

## 3. Safe rollout checklist

- Confirm email authentication and recovery flows in the Supabase dashboard.
- Apply the migration in a non-production project first.
- Keep RLS enabled and test with two distinct users; user A must not read or overwrite user B's records.
- Verify viewer cannot write, editor cannot delete, and owner/admin can manage appropriate team resources.
- Review allowed redirect URLs and rate limits.
- Configure Vercel variables, redeploy, and test sign-in, expiry/refresh, save, restore, and sign-out.
- Export local checklist state before migration; cloud sync does not migrate other tools' existing local browser data.
