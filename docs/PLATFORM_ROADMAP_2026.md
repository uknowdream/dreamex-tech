# DreamEx Tech — Platform Roadmap 2026–2027

> **Status:** Proposed product and engineering roadmap. This document is a planning baseline, not a claim that proposed capabilities are already implemented or deployed.
>
> **Product direction:** Build DreamEx Tech into a trustworthy, international engineering platform combining technical publishing with practical QA, API, security, reliability, and release-readiness workflows.

## 1. Product principles

1. **Useful before impressive:** each feature must solve a real user problem and have a measurable acceptance criterion.
2. **Evidence over claims:** distinguish static heuristics, user-supplied data, automated tests, live integrations, and production observations.
3. **Local-first by default:** keep user data in the browser unless a feature explicitly requires a backend; explain persistence, export, deletion, and privacy behavior.
4. **Accessible and responsive:** keyboard support, visible focus, semantic landmarks, sufficient contrast, reduced-motion support, touch targets, safe-area insets, and no horizontal overflow.
5. **Fast by design:** route-level code splitting, limited third-party scripts, image optimization, and performance budgets.
6. **Secure by default:** validate imports, redact secrets, avoid unsafe HTML rendering, apply least privilege, and test security headers.
7. **International-ready:** consistent Indonesian and English copy, dates/numbers, metadata, canonical URLs, and discoverable documentation.
8. **Release discipline:** no feature is considered production-ready solely because it compiles; require CI, E2E, accessibility, and production smoke evidence appropriate to its risk.

## 2. Current platform baseline

The repository currently contains a technology publication and browser-first engineering tools, including:

- Engineering Workspace, Control Plane, Command Center, Engineering Intelligence, Engineering Lab, API Playground, QA Automation Studio, Quality Intelligence Center, Supply Chain Intelligence, Security & Privacy Center, Performance Observatory, Learning Hub, Knowledge Graph, and Product Roadmap.
- Local-first workflows and portable exports in several tools.
- TypeScript, ESLint, Vite production build, build-output and bilingual verification scripts, and Playwright desktop/mobile regression workflows.
- A responsive footer redesign merged into `main`; follow-up PRs refine tablet layout and mobile navigation.

**Known planning constraints:** local-only tools must not be presented as live monitoring or server-backed collaboration. Static OpenAPI/SBOM review must not be described as a live runtime test or vulnerability scan. Production readiness must be verified against the deployed commit, not inferred from a preview or a successful build.

## 3. Navigation and premium UX workstream

### 3.1 Header, platform menu, and mobile drawer — P0

**Objective:** make every major destination discoverable without overwhelming the editorial experience.

- Use a compact, consistent desktop header with clear active-route styling.
- Group platform destinations by task: Discover, Build & Test, Security & Reliability, and Learn.
- Keep labels short and descriptions optional; avoid one long unstructured mega menu.
- On compact screens, use a right-side drawer with safe-area padding, internal scrolling, clear close behavior, and a single-column platform panel.
- Support Escape to close, restore focus to the menu trigger, expose `aria-expanded` and `aria-controls`, and prevent background interaction while the drawer is open.
- Close the drawer after route selection; ensure anchor navigation works.
- Ensure focus is visible and all actions work without a pointer.
- Honor `prefers-reduced-motion`; animation must not be required to understand state.
- Do not use hover as the only way to reveal destinations.

**Acceptance criteria**
- Playwright covers open/close, Escape, route selection, Platform expansion, focus behavior, active route, and mobile overflow.
- Keyboard-only manual check succeeds.
- Tested at 320, 360, 390, 768, 1024, 1280, and 1440 CSS pixels.
- No page-level horizontal overflow; no inaccessible hidden links.
- Header and drawer do not obscure content at browser zoom 200%.

### 3.2 Footer — P0

**Objective:** make the footer a balanced information architecture, not a long link dump.

- Keep the brand and purpose statement distinct from navigation groups.
- Use Explore, Build & Verify, and Platform & Resources groups with consistent labels and ordering.
- Use four-column desktop, balanced tablet layouts, and compact mobile groups.
- At tablet widths, prevent a single navigation group from being stranded in an awkward column.
- Keep link labels readable and wrap long internationalized labels without clipping.
- Maintain a visible, non-floating Back to Top link in the footer.
- Add meaningful hover and focus states without excessive glow or motion.
- Keep legal, privacy, RSS, repository, and contact destinations easy to find where applicable.

**Acceptance criteria**
- Visual checks at 390, 560, 700, 768, 980, 1024, and 1280 widths.
- No overlapping columns, isolated group, clipped labels, or horizontal overflow.
- All links have unique, understandable accessible names and valid destinations.
- Footer changes are checked on a production-like preview before merge.

### 3.3 Design system and interaction quality — P1

- Consolidate spacing, radii, typography, color, border, shadow, and motion tokens.
- Establish consistent page shells, hero blocks, metric cards, tool panels, empty states, loading states, error states, and export controls.
- Reduce inconsistent one-off CSS and duplicated component patterns.
- Add contrast checks, focus-visible rules, semantic heading order, and screen-reader labels.
- Prefer restrained depth, crisp typography, and purposeful motion over excessive gradients or animation.
- Test light/dark behavior only if both themes are actually supported; do not expose non-functional theme controls.

## 4. Product capability roadmap

### Phase 0 — Stabilize experience and release quality (Weeks 1–2) — P0

**Deliverables**
- Complete footer tablet balancing and mobile drawer refinements.
- Resolve all CI/E2E findings on the related pull requests.
- Add shared Playwright helpers for header navigation and footer links to avoid ambiguous duplicate locators.
- Add route inventory checks for every internal navigation destination.
- Add production smoke checks for homepage, key tool routes, `/rss.xml`, `/rss`, and `/sitemap.xml`.
- Verify actual HTTP status, content type, and essential page content.
- Document how to reproduce failures locally.

**Exit gate**
- Typecheck, lint, production build, output verification, bilingual verification, desktop E2E, and mobile E2E pass on the exact merge candidate.
- No unexplained test skips or flaky retries in changed flows.
- Deployment is READY for the exact merged commit and the production smoke test confirms expected behavior.

### Phase 1 — Navigation and discovery (Weeks 2–4) — P0/P1

**Deliverables**
- Finalize platform taxonomy and labels in Indonesian and English.
- Add a unified command palette with route search and keyboard shortcut, avoiding duplicate or misleading destinations.
- Improve workspace search with category filters, recently used tools, and clear empty states.
- Add breadcrumbs on deep tool routes where they materially improve orientation.
- Add a “what this tool does / does not do” panel for security, SBOM, API analysis, and performance heuristics.

**Success measures**
- Users can reach any core tool in at most two deliberate navigation actions.
- No dead internal links across the route inventory.
- Search results remain useful with keyboard and screen-reader navigation.

### Phase 2 — QA and API workflow depth (Weeks 4–8) — P1

**Deliverables**
- API Contract Studio: OpenAPI import, endpoint inventory, schema checks, examples, and static breaking-change comparison.
- Test data builder: deterministic synthetic data profiles with explicit safeguards against real secrets and personal data.
- QA traceability: link requirements, test cases, execution evidence, defects, and release criteria in portable project snapshots.
- Quality Intelligence improvements: trend comparison between imported reports, clearer flaky-test confidence, failure clusters, and baseline comparison.
- Playwright starter generator: produce editable test scaffolds from user-selected routes and assertions; clearly mark generated code as a starting point requiring review.
- Export evidence packages with manifest, timestamps, tool version, input hashes where appropriate, and limitations.

**Guardrails**
- Static analysis is never presented as proof of runtime correctness.
- Flaky classification must show its basis and sample size.
- Imported files are size-limited, validated, and parsed without executing user content.
- Secret-like values are redacted from previews and exports where feasible.

### Phase 3 — Security and software supply chain (Weeks 6–10) — P1

**Deliverables**
- Add Content Security Policy in Report-Only mode, review violations, then move toward enforcement with documented exceptions.
- Add a repeatable security-header verification check against the deployed site.
- Improve SBOM validation: schema errors, duplicate package identifiers, license ambiguity, and vulnerability-data provenance.
- Add dependency policy views for severity, exploitability metadata when supplied, license policy, and remediation ownership.
- Add import/export privacy notices, scoped deletion, and tests that prove unrelated browser storage is preserved.
- Add threat-model templates for common web-app assets and trust boundaries.

**Guardrails**
- No claim of live CVE scanning without a real, maintained vulnerability data source.
- No “secure” badge based solely on header presence or static heuristics.
- CSP rollout must not break analytics, RSS stylesheets, or core application routes.

### Phase 4 — Reliability and release engineering (Weeks 8–12) — P1/P2

**Deliverables**
- Review and integrate Reliability & Incident Center after checking mergeability and current CI.
- Add incident templates, timeline integrity, follow-up ownership, and postmortem exports.
- Release Readiness Center: required checks, known risks, accessibility review, security review, changelog, rollback plan, and evidence links.
- Add deployment comparison showing source commit, preview/production URL, test run IDs, and timestamp.
- Add service-level objective worksheet and error-budget calculator using user-provided data.
- Label manually entered metrics as manual; do not imply live telemetry.

**Success measures**
- Every release candidate has a repeatable readiness checklist and rollback notes.
- Incident exports are portable and include their observation window and data provenance.

### Phase 5 — Performance, accessibility, and international quality (Weeks 10–14) — P1/P2

**Deliverables**
- Measure Core Web Vitals on representative routes and real-device profiles.
- Set budgets for initial JavaScript, route chunks, image weight, and layout shift.
- Lazy-load non-critical tools and avoid loading large dependencies on the homepage.
- Run automated accessibility checks plus keyboard and screen-reader spot checks.
- Validate localization parity, untranslated strings, long-label wrapping, date formats, metadata, canonical links, and sitemap consistency.
- Add a visual regression baseline for homepage, header/drawer, footer, and representative tool pages.

**Proposed release targets**
- No critical or serious automated accessibility findings on release-critical routes.
- No horizontal overflow at the supported viewport matrix.
- No material regression in field performance; define numeric budgets after measuring a stable baseline rather than inventing targets without evidence.

### Phase 6 — Collaboration and integrations (Quarter 2, only after foundations) — P2

**Potential deliverables**
- Optional cloud sync with explicit consent and account-level data controls.
- GitHub issue/PR linking and CI evidence ingestion through least-privilege integration.
- Team workspaces, roles, audit events, and shared release evidence.
- Notifications for configured workflow failures and release readiness changes.
- API integrations with rate limits, retry policy, timeouts, and visible provider status.

**Dependency gate**
- Requires a documented backend architecture, authentication model, authorization boundaries, privacy policy, retention/deletion design, and operational ownership. Do not simulate collaboration with localStorage and market it as shared cloud functionality.

## 5. Feature prioritization matrix

| Priority | Feature/workstream | User value | Complexity | Decision |
|---|---|---:|---:|---|
| P0 | Footer and mobile navigation | High | Low–medium | Finish first |
| P0 | CI/E2E stability and production smoke | Very high | Medium | Mandatory release gate |
| P1 | Unified command palette and workspace search | High | Medium | Next |
| P1 | API Contract Studio and QA traceability | High | Medium–high | Build in slices |
| P1 | CSP and production security verification | Very high | Medium | Start in Report-Only |
| P1 | Release Readiness Center | High | Medium | Reuse existing roadmap/checklist work |
| P1 | Performance and accessibility budgets | High | Medium | Baseline before setting targets |
| P2 | GitHub integrations and cloud collaboration | High | High | After security architecture |
| P2 | AI-generated test scaffolds and failure summaries | Medium–high | High | Require evidence, explainability, and review |

## 6. Quality gates for every pull request

1. TypeScript typecheck and ESLint.
2. Production build plus build-output and bilingual verification.
3. Relevant unit/integration tests where logic is non-trivial.
4. Playwright desktop and mobile regression for affected user flows.
5. Keyboard, focus, reduced-motion, and viewport checks for UI changes.
6. Import validation, privacy, and export tests for data-handling changes.
7. Internal link and route verification for navigation changes.
8. Preview deployment inspection; never equate preview success with production deployment.
9. Production deployment confirmation for the exact commit and post-deploy smoke evidence.
10. PR description documents scope, risk, test evidence, limitations, and rollback strategy.

## 7. Execution status and immediate action list

**Status snapshot:** 14 October 2026. Repository implementation, CI validation, and production deployment are tracked separately. A merged PR is not production-verified until the exact main SHA is deployed and the production smoke checks pass.

### Implemented in the repository

- [x] **Footer and mobile navigation — PRs #14–#15.** Responsive refinements, active navigation, keyboard/touch support, and desktop/mobile coverage.
- [x] **Unified command palette — PR #17.** Route/article search, keyboard shortcut, focus handling, and desktop/mobile regression coverage.
- [x] **Workspace discovery — PR #45.** Category filters and a privacy-transparent, clearable, browser-local recent-tools list.
- [x] **Synthetic QA test data and Playwright starter generator — PR #22.** Deterministic local fixtures and editable scaffolds with review guidance.
- [x] **Production smoke workflow — PR #26.** Scheduled HTTPS checks for key tool routes, RSS XML, and sitemap with content/body markers and bounded retries.
- [x] **SBOM provenance and metadata review — PR #23.** Browser-local CycloneDX/SPDX review; imported vulnerability records are not represented as a live scan.
- [x] **CSP Report-Only and security-header verification — PR #24.** Non-enforcing baseline; no server-side violation collection endpoint is configured.
- [x] **QA traceability manifest — PR #30.** Versioned export with metadata, counts, integrity digest, and legacy import support.
- [x] **SLO/error-budget worksheet — PR #28.** Manual inputs only; not connected to live telemetry.
- [x] **API Contract Studio — PR #38.** OpenAPI inventory, static compatibility comparison, schema heuristics, example checks, Swagger 2.0 body parameters, and portable JSON export. Local schema-reference integrity is tracked separately below.
- [x] **Bilingual route breadcrumbs — PR #29.** Localized labels and keyboard/narrow-screen coverage.
- [x] **Release evidence register — PR #47.** Commit/deployment references, test evidence URLs, risks, rollback notes, and portable export; manually entered references remain unverified until checked.
- [x] **Quality Intelligence report comparison — PR #49.** Compares imported summaries and stores only summary-level history.
- [x] **Flaky-test sample size and parser limitations — PR #61.** Signals show the evidence sample size and avoid overclaiming classification.
- [x] **Incident timeline and follow-up accountability — PR #63.** Flags unsupported/inconsistent timestamps, chronology warnings, invalid incident windows, and missing owners/due dates in generated postmortems.
- [x] **Threat-model worksheet.** Local STRIDE-inspired threat register for assets, trust boundaries, scenarios, mitigation, and ownership; it is a planning aid, not automated threat detection.
- [x] **Responsive/accessibility baseline tests and performance-budget verification.** Representative routes have viewport/keyboard checks, and build verification includes route inventory and initial asset budgets.

### In progress

- [ ] **OpenAPI local schema-reference integrity — PR #64.** Bounded inspection for unresolved local schema references and malformed schema structures. Merge only after CI and desktop/mobile Playwright both pass.

### Production verification still required

- [ ] **Latest merged main commit.** The production alias currently points to commit `9ba208f9621c2342b9f1386b659e89f575615911`; the latest merged main code is newer. Vercel reported a build-rate-limit failure for the newer main status, so do not claim the latest code is deployed until a READY deployment matches the exact main SHA.
- [x] **Live endpoint smoke snapshot for the currently deployed version.** Homepage, `/api-playground`, `/rss.xml`, `/rss`, and `/sitemap.xml` returned HTTP 200. `/rss.xml` returned RSS XML; `/rss` returned the SPA HTML shell, so use `/rss.xml` as the subscription endpoint. This smoke snapshot does not verify the newer, not-yet-deployed main commit.
- [ ] **Fresh CI on the exact latest main SHA.** Confirm typecheck, lint, build, build-output/bilingual verification, and desktop/mobile browser regression. Older PR checks are not a substitute.

### Next implementation queue

1. [ ] **Finish PR #64 and close duplicate/stale branches** after required checks pass; keep one authoritative implementation per feature.
2. [ ] **Performance and accessibility follow-through.** Use existing budgets as a baseline, measure representative production routes, and add axe-style semantic checks/visual baselines only after verifying the current CI environment supports them.
3. [ ] **Internationalization and SEO production verification.** Check Indonesian/English parity, long-label wrapping, metadata, canonical URLs, RSS, and sitemap consistency against the exact deployed commit.
4. [ ] **Shared navigation test helpers.** Reduce duplicate/ambiguous locators and extend route-inventory/dead-link checks across desktop/mobile.
5. [ ] **Evidence retention and privacy review.** Keep imported data local by default, test scoped deletion, and ensure exports state provenance, size limits, and analysis limitations.
6. [ ] **Reliability & Incident Center.** Review legacy PR #7 against the merged incident timeline improvements and current architecture; rebase only if it adds distinct value and current checks pass.
7. [ ] **Collaboration/integrations only after architecture.** Do not ship simulated cloud sync. Require authentication/authorization, consent, retention/deletion, auditability, rate limits, and operational ownership before GitHub integration or team collaboration.

### Required release sequence for every feature

- [ ] Review implementation risk and automated reviewer findings.
- [ ] Run typecheck, lint, production build, build-output verification, and bilingual verification.
- [ ] Run relevant desktop and mobile Playwright coverage; investigate failures instead of bypassing them.
- [ ] Inspect the exact preview deployment and check responsive, keyboard, focus, and reduced-motion behavior.
- [ ] Merge only when required checks pass and the PR's stated limitations are accurate.
- [ ] Verify production corresponds to the merged commit; smoke-test homepage, critical tool routes, `/rss.xml`, `/rss`, and `/sitemap.xml`.
- [ ] Record failures, limitations, and rollback steps. Never infer a successful test or deployment from a successful build alone.

## 8. Definition of done

A release is complete only when the merged commit is identifiable, required CI and E2E checks have verified results, responsive/accessibility acceptance criteria are met, the deployment for that commit is confirmed, and production smoke checks pass. Any unavailable evidence must be reported as **not verified**, never inferred.
