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

**Status snapshot:** 15 October 2026. Implementation, CI validation, preview deployment, production deployment, and production smoke are separate gates. A merged PR is not production-complete merely because it is merged.

### Implemented and merged into the repository

- [x] **Responsive footer and navigation — PRs #14–#15.** Footer balancing, active routes, mobile drawer, keyboard/touch behavior, and desktop/mobile coverage.
- [x] **Unified command palette — PR #17.** Route/article discovery, keyboard shortcut, focus management, and desktop/mobile regression coverage.
- [x] **Workspace discovery — PR #45.** Category filters and clearable, browser-local recently used tools.
- [x] **Synthetic QA data and Playwright starter generation — PR #22.** Deterministic fixtures and editable scaffolds with review guidance.
- [x] **Production smoke workflow — PR #26.** Scheduled HTTPS checks for core routes, RSS, and sitemap with content/body markers and bounded retries.
- [x] **SBOM provenance and metadata review — PR #23.** Browser-local CycloneDX/SPDX review; imported vulnerability data is not represented as a live scan.
- [x] **CSP Report-Only and security-header verification — PR #24.** Non-enforcing baseline; no server-side violation collection endpoint is configured.
- [x] **QA traceability manifest — PR #30.** Versioned export with metadata, counts, integrity digest, and legacy import support.
- [x] **SLO/error-budget worksheet — PR #28.** Manual inputs only; not connected to live telemetry.
- [x] **API Contract Studio — PR #38.** OpenAPI inventory, static compatibility comparison, schema heuristics, inline example checks, Swagger 2.0 body parameters, and JSON export.
- [x] **OpenAPI local schema-reference integrity — PR #67.** Bounded checks for unresolved local references and malformed schema structures. External references are not fetched; this is not a complete validator.
- [x] **Bilingual breadcrumbs — PR #29.** Localized route labels and keyboard/narrow-screen checks.
- [x] **Release evidence register — PR #47.** Commit/deployment references, test evidence, risks, release notes, and rollback plan; manual references remain unverified until checked.
- [x] **Quality Intelligence comparison — PR #49.** Imported report summary comparison and summary-only local history.
- [x] **Flaky-test sample size — PR #61.** Retry-derived signals expose sample size and parser limitations.
- [x] **Incident timeline integrity — PR #63.** Postmortem generation flags chronology, invalid incident windows, and missing follow-up owners/due dates.
- [x] **Reliability & Incident Center — PR #74.** Dedicated local-first incident records, severity/status, timeline events, postmortem export, and manually entered delivery metrics. CI and desktop/mobile Playwright passed; the tool is not connected to live telemetry.
- [x] **Threat-model worksheet.** Local STRIDE-inspired planning aid for assets, trust boundaries, threats, and mitigations; not automated threat detection.
- [x] **Responsive/accessibility baseline and performance-budget checks.** Representative route viewport/keyboard checks, route inventory, and initial asset gzip budgets are part of repository verification.
- [x] **Premium engineering sidebar — PR #77 (merged 15 Oct 2026).** Right-side drawer, grouped platform taxonomy, internal scrolling, backdrop, focus trap/restoration, Escape behavior, scroll locking, localized labels, and desktop/mobile Playwright coverage. Typecheck/lint/build/output verification and both Playwright projects passed on PR head `956732862e01810d38c4559a7360927483e0adc4`; merge commit `a435918f54f1f6a41eb84a3ae0625a95c678057f` is deployed to Vercel production with state `READY`.

### Production verification still required

- [x] **Exact-commit deployment verified (15 Oct 2026).** Vercel deployment `dpl_73dMorb9SM5ujnbQkPcroth1a5Ja` is `READY`, target `production`, and identifies merge commit `a435918f54f1f6a41eb84a3ae0625a95c678057f`. Production aliases include `www.dreamex.tech` and `dreamex.tech`.
- [x] **Production smoke sample for the deployed sidebar commit.** Live checks returned HTTP 200 for `/`, `/api-playground`, `/reliability-center`, `/security-center`, `/rss.xml`, and `/sitemap.xml`. The RSS endpoint returned RSS 2.0 XML and the sitemap returned XML. HTML responses included HSTS (`max-age=31536000`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, Permissions Policy, and CSP Report-Only baseline directives. This is a targeted live smoke sample, not a substitute for the full scheduled smoke workflow or browser execution.
- [ ] **Fresh CI on exact main SHA.** Confirm typecheck, lint, build, output/i18n verification, and desktop/mobile Playwright for the exact merged commit. PR-head CI passed; a separate fresh main-push CI result is not yet verified in the available evidence.
- [ ] **Full scheduled production smoke after deployment.** Confirm the complete 23-path `scripts/smoke-production.mjs` workflow succeeds against the exact deployed SHA, including every required response marker and security-header assertion. The manual sample above is narrower.

### Next implementation queue

1. [x] **Finish premium sidebar PR #77 and deploy.** Merged after typecheck/lint/build/output verification and desktop/mobile Playwright passed; exact merge SHA is deployed READY.
2. [ ] **Fresh main CI and full scheduled smoke.** Verify the main-push CI result and run all 23 production smoke checks against the exact deployed SHA; targeted live smoke already passed for six critical URLs and security headers.
3. [ ] **Accessibility baseline PR #80.** The follow-up expands responsive/semantic checks to 17 routes and adapts shared navigation helpers to the new drawer's dialog semantics. Do not merge until current-head CI and both browser projects pass.
4. [ ] **Performance/accessibility follow-through.** Measure representative production routes and real-device Core Web Vitals, add automated WCAG scans and visual baselines, and tune budgets from stable measurements rather than arbitrary targets.
5. [ ] **Internationalization and SEO production verification.** Validate Indonesian/English parity, long-label wrapping, canonical host, metadata, RSS, and sitemap against the exact deployed commit.
6. [ ] **Evidence privacy and collaboration architecture.** Test scoped deletion while preserving unrelated browser storage. Do not simulate cloud sync; require authentication/authorization, consent, retention/deletion, auditability, rate limits, and operational ownership before team features or GitHub integrations.

### Required release sequence for every feature

- [ ] Review implementation risk and automated reviewer findings.
- [ ] Run typecheck, lint, production build, output verification, and bilingual verification.
- [ ] Run relevant desktop and mobile Playwright coverage; investigate failures instead of bypassing them.
- [ ] Inspect the exact preview and verify responsive, keyboard, focus, and reduced-motion behavior.
- [ ] Merge only when required checks pass and stated limitations are accurate.
- [ ] Verify production corresponds to the merged commit; smoke-test the homepage, critical tool routes, `/rss.xml`, `/rss`, and `/sitemap.xml`.
- [ ] Record failures, limitations, and rollback steps. Never infer a successful test or deployment from a successful build alone.

## 8. Definition of done

A release is complete only when the merged commit is identifiable, required CI and E2E checks have verified results, responsive/accessibility acceptance criteria are met, the deployment for that commit is confirmed, and production smoke checks pass. Any unavailable evidence must be reported as **not verified**, never inferred.
