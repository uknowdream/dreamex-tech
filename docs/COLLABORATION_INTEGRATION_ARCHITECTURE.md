# DreamEx Tech — Collaboration & Integration Architecture Readiness

> **Status:** Proposed architecture for review; no cloud-sync or team-collaboration infrastructure is claimed to exist.
>
> **Decision:** Keep current tools local-first. Do not connect external accounts or upload browser data until the security, privacy, and operational gates below are approved and implemented.

## 1. Goals and non-goals

**Goals**
- Enable opt-in project workspaces, shared release evidence, and GitHub PR/CI references.
- Enforce tenant and project isolation on the server, not in the browser.
- Make integration provenance, sync state, failures, retention, and deletion visible.
- Use least-privilege provider access with predictable rate limits and operational ownership.

**Non-goals**
- No automatic upload of localStorage, browser history, imported reports, or threat-model notes.
- No GitHub personal access tokens in the browser or database.
- No claim that a stored URL or user-entered status is independently verified.
- No agent that can merge PRs, change production configuration, or release software without a separately approved permission model.

## 2. Proposed logical architecture

```text
Browser SPA (local-first; explicit consent)
        | OIDC session + scoped API requests
        v
API gateway / application
  |-- Authentication and tenant/project authorization
  |-- Workspace and release-evidence service
  |-- Audit-event writer
  |-- Integration management service
        |
        +--> PostgreSQL (tenant-scoped records)
        +--> Encrypted object storage (evidence attachments)
        +--> Queue + workers (webhooks and sync jobs)
        +--> Secret manager (provider credentials and keys)
        +--> Observability (redacted logs, metrics, traces)
                       ^
                       |
              GitHub App webhooks/API
```

This is a target architecture, not a description of the current deployment. Select managed identity, database, queue, object storage, secret management, and hosting region only after cost, privacy, recovery, and operational requirements are reviewed.

## 3. Identity, authorization, and tenant isolation

### Authentication
- Use OpenID Connect Authorization Code Flow with PKCE.
- Use secure, HttpOnly, SameSite application-session cookies; avoid long-lived provider tokens in local storage.
- Require re-authentication for organization ownership, integration installation, destructive deletion, and credential rotation.
- Support session revocation and account disconnect.

### Authorization
- Define organization/project roles: Owner, Admin, Contributor, and Viewer.
- Apply deny-by-default checks on every API request and background job.
- Bind every workspace, evidence record, attachment, integration, and audit event to an immutable tenant/project identifier.
- Never trust tenant IDs, roles, or resource URLs supplied by the client without server-side membership checks.
- Add negative tests for cross-tenant reads, writes, exports, attachment URLs, webhook delivery, and worker retries.

### GitHub permissions
- Prefer a GitHub App with repository allowlisting over personal access tokens.
- Start with only repository metadata, pull-request metadata, and check/run read access required by the first use case.
- Do not request write permissions until a separately reviewed feature requires them.
- Support installation revoke/uninstall and repository-scope review.

## 4. Data model and provenance

Initial entities:
- **Organization:** identity-provider subject, plan, region, retention policy.
- **Membership:** organization, user, role, lifecycle timestamps.
- **Project:** organization, name, classification, retention policy.
- **Integration:** provider, installation ID, repository allowlist, granted scopes, status, last sync, sanitized error category.
- **ReleaseCandidate:** source SHA, environment, creator, lifecycle status, rollback notes.
- **EvidenceReference:** kind, URL or attachment key, source provider/run ID, supplied/observed timestamp, digest when appropriate, verification state, reviewer.
- **AuditEvent:** actor, tenant/project, action, resource, timestamp, correlation ID, outcome, redacted metadata.

Distinguish provenance states:
1. User-entered and unverified.
2. Imported from a provider response with provider identifiers and fetch timestamp.
3. Integrity-checked content.
4. Independently reviewed/attested evidence with reviewer and method.

A content digest proves byte consistency against a recorded digest; it does not prove who created the content, that the source is trustworthy, or that a test passed.

## 5. GitHub integration lifecycle

1. An organization owner initiates installation and selects allowed repositories.
2. The server stores credentials in a secret manager and records granted scopes.
3. Verify webhook signatures against the raw request body; reject invalid signatures.
4. Deduplicate delivery IDs and handle duplicate or out-of-order events safely.
5. Validate payload shape and repository allowlist before enqueueing work.
6. Use bounded timeouts, exponential backoff with jitter, retry limits, and a dead-letter queue.
7. Normalize provider responses to a versioned internal schema and label imported evidence with provenance.
8. Show last sync, source timestamp, provider status, and partial/failed synchronization.
9. On uninstall, revoke access and apply the documented deletion/retention policy.

Treat branch names, commit messages, issue titles, workflow output, test names, and attachments as untrusted content. Never render provider text as HTML.

## 6. Privacy, retention, and deletion

- Cloud sync is opt-in per organization and project; signing in must not upload existing browser-local data.
- Show a field-level preview and require explicit confirmation before first sync.
- Keep local-only and cloud-backed records visibly distinct.
- Provide export, scoped deletion, account disconnect, and organization deletion.
- Define retention for reports, attachments, webhook payloads, audit events, and logs before launch.
- Encrypt data in transit and at rest; rotate secrets and keys with an audited procedure.
- Redact tokens, cookies, authorization headers, and secret-like values from logs and exports.
- Document subprocessors, data region, backups, and deletion behavior.
- Do not place user content or secrets in analytics events.

## 7. Reliability and operations

- Enforce per-organization and per-integration rate limits, provider quota awareness, timeouts, idempotency, and bounded retries.
- Separate user-facing API traffic from webhook/sync worker queues.
- Expose states such as Connected, Syncing, Degraded, Reauthorization required, Disconnected, and Error.
- Define service-level objectives only after a stable baseline is measured.
- Assign service owner/on-call, incident severity, escalation, backup/restore drills, and rollback procedure before production.
- Provide a kill switch for each integration without disabling local-first tools.

## 8. Threat model and controls

| Threat | Required control | Verification evidence |
|---|---|---|
| Cross-tenant access | Server-side authorization and tenant-scoped queries | Negative authorization tests per resource |
| Forged/replayed webhook | Signature verification, delivery deduplication, replay policy | Invalid-signature and duplicate-delivery tests |
| Compromised credential | Secret manager, least privilege, rotation/revocation | Rotation drill and audit trail |
| Malicious imported content | Schema validation, safe text rendering, size/depth limits | Malformed payload, XSS, oversized-input tests |
| Accidental local-data upload | Explicit consent and field preview | Network test proving no upload before consent |
| Evidence misrepresented as verified | Provenance states and reviewer workflow | UI/export tests for unverified evidence |
| Data survives deletion | Retention policy and deletion jobs | Deletion audit and retention/restore test |
| Provider outage/quota exhaustion | Backoff, bounded queues, visible degraded state | Fault-injection and recovery tests |

## 9. Delivery phases and acceptance gates

### Phase A — Architecture approval
- Select identity, database, queue, object storage, secret manager, region, and cost budget.
- Approve data classification, privacy notice, retention, deletion, and incident response.
- Assign an accountable service owner.

### Phase B — Secure workspace foundation
- Implement organization/project authorization and audit events.
- Pass tenant-isolation and backup/restore tests.
- Keep cloud synchronization disabled by default.

### Phase C — Read-only GitHub integration
- Implement GitHub App installation, allowlist, webhook validation, check/PR ingestion, and sync-status visibility.
- Verify idempotency, rate limits, revoke, secret rotation, and provider-outage behavior.
- Record provider, source run, fetch time, and verification limits for imported evidence.

### Phase D — Opt-in shared release evidence
- Add explicit consent and field-level selection for syncing evidence.
- Implement reviewer identity, release-candidate history, and scoped deletion.
- Complete security, accessibility, privacy, and production rollback reviews.

**Release checklist**
- [ ] Threat model and data-flow/privacy review approved.
- [ ] Cross-tenant negative authorization tests pass.
- [ ] Secret handling and webhook replay/idempotency tests pass.
- [ ] Export, deletion, retention, backup, and restore behaviors are verified.
- [ ] Rate-limit, timeout, retry, and provider-outage tests pass.
- [ ] Security/accessibility reviews and operational ownership are recorded.
- [ ] Cost budget, on-call path, and rollback plan are documented.
- [ ] Exact release commit is deployed and post-deploy smoke checks pass.

## 10. Current implementation boundary

Until these gates are met, the Engineering Command Center, SLO worksheet, QA traceability, threat model, and release evidence register remain browser-local/manual tools. Do not describe them as live collaboration, automatic CI ingestion, cloud synchronization, or independently verified production evidence.
