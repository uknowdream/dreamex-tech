# DreamEx Tech — Current State Engineering Audit

**Audit Date:** 12 November 2026  
**Project:** DreamEx Tech (`https://dreamex.tech` → `https://www.dreamex.tech`)  
**Brand Tagline:** *"Think deeper. Build smarter."*  
**Repository:** `https://github.com/uknowdream/dreamex-tech` (`main` @ `337ec97140c131c8f9601e80312938e83f2fb48a`)  
**Vercel Project ID:** `prj_6Vo3Mp7ucTfUfMRBFNmAj9sCDd61` (Team: `uknowdream's projects` / `team_GwImIlUOGOVjctH2kjwPOzOT`)

---

## 1. Executive Summary

DreamEx Tech is an international-standard bilingual (English & Indonesian) technology publication and browser-first software engineering platform deployed on Vercel at `https://www.dreamex.tech` (with a permanent `308` redirect from `https://dreamex.tech`).

An end-to-end investigation of the repository, live production deployment, Vercel domain/project state, and GitHub CI/CD pipelines confirms:
- **Production Deployment Health:** `main` (`337ec97`) is deployed and `READY` on Vercel. All **38/38 live production smoke checks** (`scripts/smoke-production.mjs`) pass across 23 public routes, 6 technical articles, RSS/Atom feeds, XML sitemap, PWA manifest, and `/api/team-workspace` security headers.
- **CI/CD & Test Baseline:** All 4 GitHub Actions workflows (`CI`, `E2E`, `Production Smoke`, `Security Audit`), 7 build/SEO/i18n/security verification scripts, and 16 serverless API unit tests pass.
- **Key Technical Debt & Gaps Identified:**
  1. **CSS Entry Bundle Near Budget Limit (Critical Performance Risk):** `dist/assets/index-*.css` is at **49.6 KiB gzip** against a strict **50.0 KiB gzip** budget (`99.2%` capacity) because ~89 KB of CSS for `React.lazy` engineering tool routes was placed inside the global `src/styles.css` stylesheet rather than code-split per lazy route.
  2. **Long-Form Article Experience Gaps:** Article pages (`/blog/:slug`) render plain `<p>` paragraphs without a **Table of Contents (TOC)**, **interactive syntax-highlighted code blocks with copy-code buttons**, **Previous/Next article navigation**, or **BreadcrumbList JSON-LD structured data**.
  3. **Homepage Search & Discovery Gaps:** The homepage journal section supports text search and 4 category tabs (`All`, `Software Engineering`, `QA Automation`, `AI & Technology`), but lacks **interactive `#tag` filtering**, **article sorting controls** (Newest, Oldest, Reading Time, Title A–Z), and **shareable URL query parameter synchronization** (`?category=&tag=&sort=&q=`).
  4. **Dependency Security Advisory:** `react-router` / `react-router-dom` (`6.28.0`) and transitive `@typescript-eslint` `minimatch` report moderate advisories in `npm audit`.
  5. **Documentation Drift & Missing Deliverables:** `docs/PLATFORM_ROADMAP_2026.md` contains an outdated 15 October 2026 snapshot referencing commit `db429c81` and a historic `build-rate-limit` blocker that has already been resolved on `main` (`337ec97`). Additionally, the 12 core engineering documentation deliverables required for platform governance need to be established and synchronized.

---

## 2. Actual Technology Stack & Repository Inventory

| Layer | Technology / Implementation | Details |
| :--- | :--- | :--- |
| **Frontend Framework** | React `18.3.1` + TypeScript `~5.7.2` | Functional components, hooks, route-level `React.lazy` code splitting |
| **Build Tooling** | Vite `6.0.7` (`vite.config.ts`) | ES module bundling, asset hashing, CSS code splitting |
| **Routing** | React Router DOM `6.28.0` | 23 client routes + static HTML `<head>` prerendering (`scripts/prerender-routes.mjs`) |
| **Icons & UI** | Lucide React `0.468.0` + Custom CSS Design System | Deep navy (`#080d19` / `#070b14`), lime accent (`#c5ff70`), Space Grotesk, DM Sans, DM Mono |
| **Internationalization** | Custom `LanguageProvider` (`src/i18n.tsx`, `src/articleTranslations.ts`) | Full bilingual parity (`en` / `id`) verified by `scripts/verify-i18n.mjs` |
| **Backend / Serverless** | Vercel Node.js Function (`api/team-workspace.js`) | Upstash Redis REST API, Lua compare-and-set scripts, SHA-256 token hashing, RBAC (`owner`, `admin`, `editor`, `viewer`), 200-entry bounded audit log |
| **Static Feeds & SEO** | Custom Node.js build scripts (`scripts/generate-rss.mjs`, `scripts/prerender-routes.mjs`) | Generates `public/rss.xml`, `public/sitemap.xml`, and route-specific `dist/<route>/index.html` metadata |
| **Testing & QA** | Node.js Test Runner (`node:test`) + Playwright `1.52.0` | 16 API unit tests (`tests/api/team-workspace.test.mjs`) + 26 E2E spec files (`tests/e2e/*.spec.ts`) |

---

## 3. Detailed Findings: Working, Partial, Broken, Missing & Technical Debt

### 3.1 What Currently Works (Preserve)
1. **23 Public Routes & 18 Interactive Engineering Workbenches:**
   - Editorial & Core: `/`, `/blog/:slug` (6 bilingual articles), `/reading-list`, `/about`, `/rss`
   - Engineering Suites: `/launchpad`, `/control-plane`, `/workspace`, `/api-playground`, `/performance`, `/knowledge-graph`, `/lab`, `/learn`, `/observatory`, `/devtools`, `/roadmap`, `/command-center`, `/qa-studio`, `/security-center`, `/engineering-intelligence`, `/quality-intelligence`, `/supply-chain-intelligence`, `/reliability-center`, `/site-audit`, `/team-workspace`, `/github-integration`
2. **Prerendered SEO & Structured Data:**
   - Every static route and article route gets its own `dist/<route>/index.html` at build time with canonical URL (`https://dreamex.tech/...`), Open Graph, Twitter Card, and JSON-LD (`Organization`, `WebSite`, `Article`).
3. **Security Header Architecture (`vercel.json`):**
   - Enforced `Content-Security-Policy`, staged `Content-Security-Policy-Report-Only`, `Strict-Transport-Security` (`max-age=63072000; includeSubDomains; preload`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`.
4. **Hardened Serverless Team Workspace (`api/team-workspace.js`):**
   - Timing-safe Owner token verification, SHA-256 hashed member tokens stored in Redis, Lua atomic compare-and-set revision checks (`409 revision_conflict`), strict CORS allowlist (`https://dreamex.tech`, `https://www.dreamex.tech`), and safe `503 workspace_not_configured` fallback when env vars are absent.

### 3.2 What Is Partially Implemented
1. **Article Reading Experience (`src/App.tsx` / `src/articles.ts`):**
   - Has reading progress bar, copy link, copy Markdown citation, reading-list bookmarking, and resume-reading persistence, **but** article bodies are flat arrays of plain text paragraphs without section headings, Table of Contents (TOC), technical code blocks with syntax highlighting/copying, or Previous/Next article navigation.
2. **Homepage Article Discovery (`src/App.tsx`):**
   - Has search box (`Ctrl+K` / `/`) and 4 category filter buttons, **but** `#tag` badges on article cards are static spans (not interactive filters), there is no sort control on the homepage feed, and filter states are not synced to URL query parameters.
3. **Team Workspace Production Environment Variables:**
   - `api/team-workspace.js` is deployed and healthy (`503 workspace_not_configured`), awaiting optional `KV_REST_API_URL`, `KV_REST_API_TOKEN`, and `DREAMEX_WORKSPACE_TOKEN` configuration in Vercel Project Settings if cross-device team sync is desired.

### 3.3 What Creates Technical Debt or Risk
1. **Entry CSS Bundle Size (`49.6 KiB` / `50.0 KiB` gzip limit):**
   - `src/styles.css` is `246.6 KB` raw (`3,191` lines) and bundles ~89 KB of styles for lazy-loaded engineering tool routes directly into the initial entry CSS chunk (`dist/assets/index-*.css`). Adding even 450 bytes of gzipped CSS to `src/styles.css` without refactoring will fail `scripts/verify-performance-budget.mjs`.
2. **Vercel Plugin OAuth Project Scope:**
   - Account-level and domain-level Vercel MCP calls (`get_auth_user`, `list_teams`, `list_domains`, `get_domain_project_domains`, `get_records`, `git_namespaces`, `search_repo`) succeed, confirming `dreamex.tech` is attached to `prj_6Vo3Mp7ucTfUfMRBFNmAj9sCDd61` and verified. However, project-scoped MCP endpoints (`get_project`, `list_deployments`, `get_runtime_logs`, `filter_project_envs`) return `404/403` because the Vercel OAuth integration needs project access to `dreamex-tech` enabled in Vercel Team Settings.
3. **Stale Roadmap Documentation (`docs/PLATFORM_ROADMAP_2026.md`):**
   - Still reflects an October 15, 2026 status snapshot (`db429c81`) rather than the live November 2026 `337ec97` production state.

---

## 4. Baseline Metrics (Pre-Modernization)

| Metric / Check | Baseline Value | Budget / Target | Status |
| :--- | :--- | :--- | :--- |
| **Initial JS Bundle (raw / gzip)** | `398.0 KiB` / `120.0 KiB` | `<= 160.0 KiB` gzip | PASS (`75.0%` of budget) |
| **Initial CSS Bundle (raw / gzip)** | `289.0 KiB` / `49.6 KiB` | `<= 50.0 KiB` gzip | AT RISK (`99.2%` of budget) |
| **Prerendered Routes** | `24` static + `6` articles (`30` HTML files) | `100%` public routes | PASS |
| **Bilingual i18n Parity** | `6` articles + `100%` UI keys (`en` / `id`) | `100%` parity | PASS |
| **API Unit Tests (`npm run test:api`)** | `16 / 16` passing (`402ms`) | `100%` pass | PASS |
| **Live Production Smoke (`smoke-production.mjs`)** | `38 / 38` passing against `https://www.dreamex.tech` | `100%` pass | PASS |
