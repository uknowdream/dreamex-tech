# DreamEx Tech — Technical Modernization Roadmap (2026)

**Project:** DreamEx Tech (`https://dreamex.tech`)  
**Brand Tagline:** *"Think deeper. Build smarter."*  
**Baseline Commit:** `337ec97140c131c8f9601e80312938e83f2fb48a`  
**Status:** Active Execution across Phases 1–9

---

## 1. Architectural Strategy & Principles

1. **Preserve Working Systems & Verification Contracts:**
   - Maintain 100% compatibility with all build-time and CI gates: `generate-rss.mjs`, `prerender-routes.mjs`, `verify-build.mjs`, `verify-routes.mjs`, `verify-performance-budget.mjs`, `verify-seo.mjs`, `verify-prerender.mjs`, `verify-i18n.mjs`, `verify-security-config.mjs`, `tests/api/team-workspace.test.mjs`, and the Playwright E2E suite.
2. **Eliminate CSS Bundle Technical Debt via Route-Level Code Splitting:**
   - Extract route-specific CSS for lazy-loaded engineering workbenches (`EngineeringPlatform`, `EngineeringRoadmap`, `EngineeringCommandCenter`, `EngineeringQualitySuite`, `EngineeringIntelligence`, `EngineeringControlPlane`, `QualityIntelligence`, `SupplyChainIntelligence`, `ReliabilityCenter`) out of `src/styles.css` into co-located CSS modules imported by their respective `React.lazy` components.
   - Target: Reduce initial entry CSS (`dist/assets/index-*.css`) from `49.6 KiB` gzip to `< 38.0 KiB` gzip (freeing `> 12 KiB` gzip headroom while preserving identical styling on every route).
3. **Elevate Editorial & Technical Reading Experience:**
   - Enhance all 6 bilingual technical articles (`en` and `id`) with structured section headings, **Table of Contents (TOC)** with smooth section jump links, **syntax-highlighted technical code blocks with one-click Copy-Code buttons**, **author & editorial metadata**, **Previous / Next article navigation**, and **BreadcrumbList JSON-LD schema**.
4. **Upgrade Search, Discovery & Filtering:**
   - Add **interactive `#tag` filtering**, **article sorting controls** (`Newest`, `Oldest`, `Quickest read`, `Title A–Z`), and **active filter summary + one-click reset** to the homepage journal discovery system.

---

## 2. Phased Implementation Plan

### Phase 1: Project Discovery & Current State Audit (`Completed`)
- Inspect full repository structure, scripts, workflows, Vercel MCP domain/project bindings, and GitHub commit/check status.
- Run baseline build, verification scripts, API unit tests, and 38-point production smoke test.
- Deliver `CURRENT_STATE_AUDIT.md`.

### Phase 2: Technical Planning & Roadmap Alignment (`Completed`)
- Define architectural modernization plan in `TECHNICAL_ROADMAP.md`.
- Update `docs/PLATFORM_ROADMAP_2026.md` to reflect the verified November 2026 production state (`337ec97`).

### Phase 3: Design System & CSS Architecture Modernization (`In Progress`)
- Split ~89 KB of lazy-route CSS out of `src/styles.css` into route-scoped stylesheets imported by each `React.lazy` route component.
- Design and style new reusable editorial components (`.article-toc`, `.article-section-heading`, `.article-code-block`, `.article-prev-next`, `.discovery-controls`, `.tag-filter-row`, `.sort-control`) adhering to the `#080d19` deep navy and `#c5ff70` accent token system.
- Document tokens, typography, and component patterns in `DESIGN_SYSTEM.md`.

### Phase 4: Application & Editorial Modernization (`Next`)
- **Article System (`src/articles.ts`, `src/articleTranslations.ts`, `src/App.tsx`):**
  - Add structured sections (`sections` with `id`, `heading`, `body`, and realistic engineering `code` snippet + language) to all 6 articles in both English and Indonesian while preserving existing `body` arrays and regex-parsed fields (`slug`, `title`, `excerpt`, `category`, `readTime`, `publishedAt`, `updatedAt`, `tags`) for 100% compatibility with `generate-rss.mjs` and `prerender-routes.mjs`.
  - Render interactive **Table of Contents**, **Code Block with Copy button**, **Author & Updated Metadata**, **Previous / Next Article cards**, and **BreadcrumbList JSON-LD** in `ArticlePage`.
- **Search & Discovery (`src/App.tsx`):**
  - Add clickable `#tag` filter pills (both in the discovery bar and on article card tags) and an accessible **Sort articles** selector (`newest`, `oldest`, `readTime`, `title`) on the homepage journal section.

### Phase 5: Performance Optimization (`Next`)
- Verify entry CSS gzip size reduction (`< 38 KiB` gzip vs `49.6 KiB` baseline).
- Verify entry JS gzip size remains well within the `160 KiB` budget.
- Document before/after bundle and runtime metrics in `PERFORMANCE_REPORT.md`.

### Phase 6: Security & Technical SEO Hardening (`Next`)
- Verify `BreadcrumbList` + `Article` JSON-LD schemas on article pages.
- Verify CSP, HSTS, CORS, and token-hashing invariants via `npm run verify:security` and `npm run verify:build`.
- Document security architecture, advisories, and mitigations in `SECURITY_AUDIT.md` and `SEO_AUDIT.md`.

### Phase 7: Vercel & GitHub Integration Verification (`Next`)
- Document exact Vercel domain, DNS, redirect (`308`), build/output configuration, optional Upstash Redis environment variables, and OAuth project permission scope in `VERCEL_DEPLOYMENT.md`.

### Phase 8: Comprehensive Automated Testing (`Next`)
- Add unit/E2E test assertions for new article TOC, copy-code, previous/next navigation, tag filtering, and article sorting.
- Run full verification suite (`typecheck`, `lint`, `build`, `verify:build`, `verify:i18n`, `verify:security`, `test:api`, and Playwright E2E checks).
- Document results in `TEST_REPORT.md` and `ACCESSIBILITY_REPORT.md`.

### Phase 9: Final Engineering Audit & Documentation Suite (`Next`)
- Complete and cross-verify all 12 required documentation deliverables (`README.md`, `CURRENT_STATE_AUDIT.md`, `TECHNICAL_ROADMAP.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `VERCEL_DEPLOYMENT.md`, `SECURITY_AUDIT.md`, `PERFORMANCE_REPORT.md`, `SEO_AUDIT.md`, `ACCESSIBILITY_REPORT.md`, `TEST_REPORT.md`, `CHANGELOG.md`).
