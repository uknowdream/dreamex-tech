# DreamEx Tech — System & Platform Architecture

**Project:** DreamEx Tech (`https://dreamex.tech` / `https://www.dreamex.tech`)  
**Brand Tagline:** *"Think deeper. Build smarter."*  
**Architecture Paradigm:** Prerendered Bilingual Editorial Publication + Local-First Engineering Workbench Suite + Hardened Serverless Collaboration API

---

## 1. High-Level Architecture Overview

DreamEx Tech combines two tightly integrated product surfaces inside a single, fast, zero-bloat web platform deployed on Vercel:

1. **International Technology Publication (`/` & `/blog/:slug`, `/reading-list`, `/rss`, `/about`):**
   - Bilingual (`en` & `id`) long-form software engineering, QA automation, DevSecOps, and applied AI journal.
   - Build-time static `<head>` metadata prerendering (`scripts/prerender-routes.mjs`), RSS 2.0 + XSL stylesheet generation (`scripts/generate-rss.mjs`), XML sitemap generation (`public/sitemap.xml`), and structured JSON-LD (`Organization`, `WebSite`, `Article`, `BreadcrumbList`).
   - Interactive article reading experience with reading progress persistence, Table of Contents (TOC) jump links, reference implementation code blocks with one-click copy, Markdown citation export, and Previous/Next sequential navigation.

2. **Browser-First Engineering Platform (18 Specialized Workbenches):**
   - Local-first engineering tools that execute deterministically in the browser without silently exfiltrating proprietary code, OpenAPI contracts, SBOMs, or test artifacts.
   - Route-level JavaScript and CSS code splitting via `React.lazy(...)` so heavy workbenches only load when visited.

3. **Hardened Serverless Collaboration Backend (`/api/team-workspace`):**
   - Optional Vercel Node.js Serverless Function (`api/team-workspace.js`) backed by Upstash Redis REST API.
   - Provides Lua-scripted optimistic concurrency (`409 revision_conflict`), SHA-256 hashed member tokens, Role-Based Access Control (`owner`, `admin`, `editor`, `viewer`), and a bounded 200-entry append-only audit log.

---

## 2. System Component Diagram

```
+-----------------------------------------------------------------------------------+
|                           Client Browser (HTTPS / HSTS)                           |
|  https://www.dreamex.tech (308 canonical redirect from https://dreamex.tech)      |
+-----------------------------------------+-----------------------------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                                                   |
        v                                                                   v
+-------+-------------------------------------------------+       +---------+---------------------------------------+
|  Static Prerendered Edge Assets (Vercel CDN)            |       |  Vercel Serverless Function                     |
|  - dist/<route>/index.html (30 prerendered HTML files)  |       |  /api/team-workspace (api/team-workspace.js)    |
|  - Entry JS/CSS + Route-Split Lazy Chunks               |       |  - Origin allowlist (dreamex.tech, www)         |
|  - /rss.xml, /rss.xsl, /sitemap.xml, /manifest          |       |  - Timing-safe Owner token + SHA-256 Member IDs |
|  - Enforced CSP + HSTS + COOP + CORP headers            |       |  - RBAC: owner | admin | editor | viewer        |
+-------+-------------------------------------------------+       +---------+---------------------------------------+
        |                                                                   |
        v                                                                   v
+-------+-------------------------------------------------+       +---------+---------------------------------------+
|  React 18 + TypeScript + React Router 6 Runtime         |       |  Upstash Redis REST API (Optional)              |
|  - Bilingual Provider (src/i18n.tsx, EN/ID parity)      |       |  - Lua CAS snapshot updates (revision check)    |
|  - Editorial Engine (src/articles.ts + Enhancements)    |       |  - Member token hash registry (max 100 tokens)  |
|  - 18 Lazy-Loaded Engineering Workbenches               |       |  - Bounded audit log (LPUSH + LTRIM 200 items)  |
+---------------------------------------------------------+       +-------------------------------------------------+
```

---

## 3. Route & Module Inventory

| Route Path | Component / Module | Loading Strategy | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| `/` | `Home` (`src/App.tsx`) | Entry Bundle | Editorial hero, Engineering Launchpad, featured insight, searchable/sortable/tag-filterable journal |
| `/blog/:slug` | `ArticlePage` (`src/App.tsx`) | Entry Bundle | Long-form bilingual article reader, TOC, copyable code block, citation export, prev/next nav |
| `/reading-list` | `ReadingListPage` (`src/App.tsx`) | Entry Bundle | Personal bookmark manager with search, sort, Markdown export, and JSON backup/restore (`noindex`) |
| `/about` | `AboutPage` (`src/App.tsx`) | Entry Bundle | Editorial mission, engineering disciplines, and platform principles |
| `/rss` | `RssPage` (`src/App.tsx`) | Entry Bundle | Human-friendly RSS reader and feed subscription center |
| `/lab` | `LabPage` (`src/App.tsx`) | Entry Bundle | QA test case generator, OpenAPI 3 contract analyzer, release readiness scorecard, postmortem builder |
| `/learn` | `LearnPage` (`src/App.tsx`) | Entry Bundle | Curated engineering learning paths with persistent progress + searchable 12-term glossary |
| `/observatory` | `WebQualityObservatoryPage` (`src/App.tsx`) | Entry Bundle | 12-point live DOM metadata, accessibility, and security signal inspector |
| `/devtools` | `DeveloperUtilitiesPage` (`src/App.tsx`) | Entry Bundle | JSON Schema generator, safe Regex tester with timeout guard, and local JWT decoder |
| `/workspace` | `EngineeringWorkspacePage` (`src/EngineeringPlatform.tsx`) | `React.lazy` | Unified searchable & filterable directory of all engineering workbenches |
| `/api-playground` | `ApiPlaygroundPage` (`src/EngineeringPlatform.tsx`) | `React.lazy` | Browser HTTP client with secret-header redaction + OpenAPI Contract Studio |
| `/performance` | `PerformanceObservatoryPage` (`src/EngineeringPlatform.tsx`) | `React.lazy` | Browser Navigation Timing, Web Vitals, and SLO Error-Budget calculator |
| `/knowledge-graph` | `EngineeringKnowledgeGraphPage` (`src/EngineeringPlatform.tsx`) | `React.lazy` | Interactive graph connecting articles, concepts, and engineering tools |
| `/roadmap` | `EngineeringRoadmapPage` (`src/EngineeringRoadmap.tsx` + `.css`) | `React.lazy` | Interactive roadmap tracker, project readiness scorecard, ADR builder, and STRIDE threat modeler |
| `/command-center` | `EngineeringCommandCenterPage` (`src/EngineeringCommandCenter.tsx` + `.css`) | `React.lazy` | Work items, incident log, ADR registry, release gates, and Release Evidence Register |
| `/qa-studio` | `QAAutomationStudioPage` (`src/EngineeringQualitySuite.tsx` + `.css`) | `React.lazy` | Test cases, BDD/Gherkin, bug reports, QA Traceability matrix, synthetic data, Playwright starter |
| `/security-center` | `SecurityCenterPage` (`src/EngineeringQualitySuite.tsx` + `.css`) | `React.lazy` | Browser security baseline, local storage privacy inspector/wiper, and STRIDE worksheet |
| `/engineering-intelligence` | `EngineeringIntelligencePage` (`src/EngineeringIntelligence.tsx` + `.css`) | `React.lazy` | Service catalog + OpenAPI breaking-change comparator |
| `/control-plane` | `EngineeringControlPlanePage` (`src/EngineeringControlPlane.tsx` + `.css`) | `React.lazy` | Unified workflow health, browser session signals, and release checklist |
| `/quality-intelligence` | `QualityIntelligencePage` (`src/QualityIntelligence.tsx` + `.css`) | `React.lazy` | Local JUnit XML & Playwright JSON test report analyzer with flaky-test detection & run comparison |
| `/supply-chain-intelligence` | `SupplyChainIntelligencePage` (`src/SupplyChainIntelligence.tsx` + `.css`) | `React.lazy` | CycloneDX & SPDX SBOM inspector, license/vulnerability reviewer, and SHA-256 integrity verifier |
| `/reliability-center` | `ReliabilityCenterPage` (`src/ReliabilityCenter.tsx` + `.css`) | `React.lazy` | Incident timeline builder with chronology validation, DORA metric tracker, and postmortem exporter |
| `/site-audit` | `SiteAuditPage` (`src/SiteAudit.tsx` + `.css`) | `React.lazy` | Interactive page health audit across SEO, accessibility, and document structure |
| `/team-workspace` | `TeamWorkspacePage` (`src/TeamWorkspace.tsx`) | `React.lazy` | Shared team workspace client with local-first fallback and optional Upstash Redis sync |
| `/github-integration` (`/github-ci`) | `GitHubIntegrationPage` (`src/GitHubIntegration.tsx` + `.css`) | `React.lazy` | Public GitHub repository, workflow run, and pull request inspector |

---

## 4. Build, Prerender & Verification Pipeline

Every production build (`npm run build` followed by `npm run verify:build`) executes a deterministic multi-stage pipeline:

1. **`node scripts/generate-rss.mjs`**:
   - Parses `src/articles.ts` and `src/App.tsx`, validates all slugs, dates, and canonical routes, and writes `public/rss.xml` and `public/sitemap.xml`.
2. **`tsc -b`**:
   - Enforces strict TypeScript compilation across `src/` with zero implicit `any` or unused locals.
3. **`vite build`**:
   - Bundles the application into `dist/` with hashed assets and route-scoped JS/CSS chunks.
4. **`node scripts/prerender-routes.mjs`**:
   - Generates 24 static route HTML files and 6 article HTML files (`dist/<route>/index.html`), injecting route-specific `<title>`, `<meta name="description">`, `<link rel="canonical">`, Open Graph, Twitter Card, and `article:published_time` tags so crawlers and social unfurlers receive complete metadata without executing JavaScript.
5. **Post-Build Verification Gates (`npm run verify:build`)**:
   - `verify-build.mjs`: Validates output files, asset references, and reduced-motion CSS support.
   - `verify-routes.mjs`: Verifies all 25 route patterns and 59 internal links resolve cleanly.
   - `verify-performance-budget.mjs`: Enforces `<= 160 KiB` gzip initial JS and `<= 50 KiB` gzip initial CSS.
   - `verify-seo.mjs` & `verify-prerender.mjs`: Validates canonical URLs, social cards, and prerendered HTML integrity.
   - `verify-i18n.mjs`: Enforces 100% English/Indonesian translation parity.
   - `verify-security-config.mjs`: Enforces CSP, HSTS, security headers, and server-only secret boundaries.
