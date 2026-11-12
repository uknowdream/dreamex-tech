# Changelog — DreamEx Tech

All notable engineering, editorial, performance, security, and infrastructure changes to the DreamEx Tech platform (`https://dreamex.tech`) are documented in this file.

---

## [2026.11.12] — Complete Platform Audit, CSS Code Splitting & Editorial Modernization

### Added
- **Long-Form Article Experience (`src/articleEnhancements.ts`, `src/App.tsx`, `src/design-refinement.css`):**
  - Added bilingual (`en` / `id`) **Table of Contents (TOC)** (`<nav class="article-toc">`) with smooth section jump links to all 6 technical articles.
  - Added anchored section headings (`.article-section-heading`) structuring long-form articles into scannable engineering sections.
  - Added **Reference Implementation Code Blocks** (`.article-code-block`) with filename headers, language badges, captions, and one-click **Copy code / Salin kode** buttons with `aria-live` status feedback.
  - Added **Previous & Next Article Navigation** (`<nav class="article-prev-next">`) at the bottom of article pages.
  - Added editorial author role and `Updated <YYYY-MM-DD>` metadata display on article headers.
  - Added Schema.org **`BreadcrumbList` JSON-LD** (`script[data-breadcrumb-schema="true"]`) and `dateModified` on `Article` JSON-LD (`script[data-article-schema="true"]`).
- **Homepage Journal Discovery (`src/App.tsx`, `src/design-refinement.css`):**
  - Added interactive **`#tag` filtering** (`.tag-filter-row` and clickable `.tag-chip` buttons on article cards) with active state (`aria-pressed`) and one-click filter reset.
  - Added **Article Sorting control** (`.article-sort-control`) supporting `Featured order`, `Newest first`, `Oldest first`, `Shortest read`, and `Title A–Z`.
- **Automated E2E Coverage (`tests/e2e/site.spec.ts`):**
  - Added Playwright E2E tests verifying article TOC, copy-code clipboard interaction, `BreadcrumbList` JSON-LD schema, Previous/Next article links, homepage `#tag` filtering, and article sorting.
- **Complete Engineering Governance Documentation Suite (12 Deliverables):**
  - Added `CURRENT_STATE_AUDIT.md`, `TECHNICAL_ROADMAP.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `VERCEL_DEPLOYMENT.md`, `SECURITY_AUDIT.md`, `PERFORMANCE_REPORT.md`, `SEO_AUDIT.md`, `ACCESSIBILITY_REPORT.md`, `TEST_REPORT.md`, and `CHANGELOG.md`, and updated `README.md` and `docs/PLATFORM_ROADMAP_2026.md`.

### Changed & Optimized
- **Route-Level CSS Code Splitting (`src/styles.css` → 7 Co-Located Route Stylesheets):**
  - Extracted route-specific styles for lazy-loaded engineering workbenches into `src/EngineeringRoadmap.css`, `src/EngineeringQualitySuite.css`, `src/EngineeringIntelligence.css`, `src/EngineeringControlPlane.css`, `src/QualityIntelligence.css`, `src/SupplyChainIntelligence.css`, and `src/ReliabilityCenter.css`.
  - **Reduced initial entry CSS bundle (`dist/assets/index-*.css`) from `289.0 KiB` raw / `49.6 KiB` gzip (`99.2%` of budget) to `227.0 KiB` raw / `40.5 KiB` gzip (`81.0%` of budget)** — an **18.3% gzip reduction** freeing `9.5 KiB` of gzip budget headroom.

---

## [2026.11.01] — Commit `337ec97` (PRs #103–#119)

### Added & Improved
- Refreshed DreamEx Tech premium homepage visuals (`PR #119`).
- Added interactive Page Health & Site Audit workbench at `/site-audit` (`PR #113`, `PR #118`).
- Hardened `/api/team-workspace` Upstash Redis collaboration API with SHA-256 member token hashing, RBAC (`owner`, `admin`, `editor`, `viewer`), Lua atomic compare-and-set revision checks, and bounded 200-entry audit log (`PR #106`, `PR #107`, `PR #114`).
- Enforced production `Content-Security-Policy` alongside staged `Content-Security-Policy-Report-Only` (`PR #110`).
- Added browser-first GitHub repository, workflow run, and pull request inspector at `/github-integration` (`PR #103`).
