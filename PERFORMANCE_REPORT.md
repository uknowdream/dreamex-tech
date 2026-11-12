# DreamEx Tech — Performance Optimization & Bundle Report

**Report Date:** 12 November 2026  
**Project:** DreamEx Tech (`https://dreamex.tech` / `https://www.dreamex.tech`)  
**Enforcement Script:** `scripts/verify-performance-budget.mjs`

---

## 1. Executive Summary

During the Phase 1 baseline audit, the initial entry stylesheet (`dist/assets/index-*.css`) measured **`289.0 KiB` raw / `49.6 KiB` gzip**, consuming **`99.2%`** of the strict `50.0 KiB` gzip performance budget (`scripts/verify-performance-budget.mjs`). Root-cause analysis revealed that ~89 KB of route-specific CSS for 7 `React.lazy` engineering workbenches was bundled inside the global `src/styles.css` stylesheet rather than co-located with each lazy route.

By extracting those 7 route-specific stylesheets (`EngineeringRoadmap.css`, `EngineeringQualitySuite.css`, `EngineeringIntelligence.css`, `EngineeringControlPlane.css`, `QualityIntelligence.css`, `SupplyChainIntelligence.css`, `ReliabilityCenter.css`) and importing them inside their respective `React.lazy` route modules, Vite now automatically splits them into on-demand CSS chunks.

---

## 2. Before vs. After Bundle Metrics

Measured via `npm run build` and `node scripts/verify-performance-budget.mjs`:

| Metric | Baseline (`337ec97`) | Post-Modernization | Delta | Enforced Budget | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Initial Entry CSS (Raw)** | `289.0 KiB` | `227.0 KiB` | **`-62.0 KiB` (`-21.5%`)** | — | **OPTIMIZED** |
| **Initial Entry CSS (Gzip)** | `49.6 KiB` (`99.2%` of budget) | `40.5 KiB` (`81.0%` of budget) | **`-9.1 KiB` (`-18.3%`)** | `<= 50.0 KiB` gzip | **PASS (`9.5 KiB` headroom)** |
| **Initial Entry JS (Raw)** | `398.0 KiB` | `413.6 KiB` | `+15.6 KiB` (TOC, code snippets, tag/sort UI) | — | **OPTIMIZED** |
| **Initial Entry JS (Gzip)** | `120.0 KiB` (`75.0%` of budget) | `124.1 KiB` (`77.6%` of budget) | `+4.1 KiB` | `<= 160.0 KiB` gzip | **PASS (`35.9 KiB` headroom)** |
| **Prerendered HTML Shell** | `3.50 kB` (`1.12 kB` gzip) | `3.50 kB` (`1.12 kB` gzip) | `0.00 kB` | Minimal critical shell | **PASS** |

---

## 3. On-Demand Lazy Chunk Inventory (`dist/assets/`)

All heavy engineering workbenches are decoupled from the initial homepage load via `React.lazy` and Vite automatic chunk splitting:

| Route / Workbench | JS Chunk (Raw / Gzip) | CSS Chunk (Raw / Gzip) | Loaded When |
| :--- | :--- | :--- | :--- |
| `EngineeringQualitySuite` (`/qa-studio`, `/security-center`) | `50.16 kB` / `15.62 kB` | `18.89 kB` / `3.65 kB` | Navigating to `/qa-studio` or `/security-center` |
| `EngineeringCommandCenter` (`/command-center`) | `47.61 kB` / `13.49 kB` | `12.92 kB` / `2.62 kB` | Navigating to `/command-center` |
| `EngineeringPlatform` (`/workspace`, `/api-playground`, `/performance`, `/knowledge-graph`) | `46.38 kB` / `14.88 kB` | `4.57 kB` / `1.30 kB` | Navigating to platform core tools |
| `EngineeringIntelligence` (`/engineering-intelligence`) | `28.24 kB` / `8.65 kB` | `12.85 kB` / `3.09 kB` | Navigating to `/engineering-intelligence` |
| `TeamWorkspace` (`/team-workspace`) | `26.82 kB` / `7.80 kB` | Shared | Navigating to `/team-workspace` |
| `SupplyChainIntelligence` (`/supply-chain-intelligence`) | `26.43 kB` / `8.66 kB` | `11.57 kB` / `2.77 kB` | Navigating to `/supply-chain-intelligence` |
| `EngineeringRoadmap` (`/roadmap`) | `23.51 kB` / `7.91 kB` | `7.17 kB` / `1.87 kB` | Navigating to `/roadmap` |
| `QualityIntelligence` (`/quality-intelligence`) | `22.99 kB` / `7.68 kB` | `12.19 kB` / `2.80 kB` | Navigating to `/quality-intelligence` |
| `ReliabilityCenter` (`/reliability-center`) | `18.69 kB` / `6.15 kB` | `10.11 kB` / `2.49 kB` | Navigating to `/reliability-center` |
| `EngineeringControlPlane` (`/control-plane`) | `11.38 kB` / `4.17 kB` | `8.10 kB` / `2.27 kB` | Navigating to `/control-plane` |
| `SiteAudit` (`/site-audit`) | `10.46 kB` / `3.86 kB` | `5.09 kB` / `1.46 kB` | Navigating to `/site-audit` |
| `GitHubIntegration` (`/github-integration`, `/github-ci`) | `9.29 kB` / `3.56 kB` | `9.96 kB` / `2.55 kB` | Navigating to `/github-integration` |

---

## 4. Runtime & Rendering Optimizations

1. **Zero Layout Shift (CLS Prevention):**
   - Fixed header height (`76px` desktop, `66px` mobile), explicit aspect/min-height containers on hero terminals and cards, and `font-display: swap` on Google Fonts (`Space Grotesk`, `DM Sans`, `DM Mono`) with preconnect hints in `index.html`.
2. **GPU-Friendly Motion (`transform` & `opacity` only):**
   - Scroll-reveal (`IntersectionObserver` batched via `requestAnimationFrame` in `MotionOnScroll`) and reading progress bar (`transform: scaleX(...)` with `will-change: transform`) avoid layout thrashing during scroll.
3. **Edge Caching & Service Worker (`public/sw.js`):**
   - Hashed Vite assets under `/assets/*` are served immutable from Vercel's global CDN, while `/api/*` explicitly disables caching (`Cache-Control: no-store, max-age=0`).
