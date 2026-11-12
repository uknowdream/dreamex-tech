# DreamEx Tech — Accessibility & Inclusive Design Report

**Audit Date:** 12 November 2026  
**Project:** DreamEx Tech (`https://dreamex.tech` / `https://www.dreamex.tech`)  
**Target Standard:** WCAG 2.2 AA  
**Automated Verification Suites:** `tests/e2e/accessibility-baseline.spec.ts`, `tests/e2e/accessibility-responsive-baseline.spec.ts`, `tests/e2e/expanded-route-responsive-audit.spec.ts`, `tests/e2e/motion-performance.spec.ts`

---

## 1. Executive Summary

DreamEx Tech is engineered with keyboard-first navigation, semantic landmarks, high-contrast dark-mode color tokens, bilingual (`en` / `id`) ARIA labels, focus trapping on modal drawers/palettes, and strict `prefers-reduced-motion` support across all 23 routes and 6 viewport breakpoints (`320px`, `360px`, `390px`, `768px`, `1024px`, `1440px`).

---

## 2. WCAG 2.2 AA Compliance Matrix

| Accessibility Domain | Implementation Details | Verification Method | Status |
| :--- | :--- | :--- | :--- |
| **Skip Navigation (`2.4.1`)** | `<a class="skip-link" href="#main-content">` is the first focusable element on every route; reveals on `:focus` and moves focus to `main#main-content` | `accessibility-baseline.spec.ts` (`Tab` focus test on all 17+ routes) | **PASS** |
| **Semantic Landmarks & Headings (`1.3.1`, `2.4.6`)** | Exactly one `<main id="main-content">` and one primary `<h1>` per route; `<header>`, `<nav>`, `<section>`, `<article>`, and `<footer>` landmarks | `accessibility-responsive-baseline.spec.ts` | **PASS** |
| **Document Language (`3.1.1`)** | `<html lang="en">` / `<html lang="id">` dynamically synchronized with the bilingual language switcher (`src/i18n.tsx`) | `site.spec.ts` & `verify-i18n.mjs` | **PASS** |
| **Keyboard Focus Visibility (`2.4.7`, `2.4.11`)** | Global `:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 3px; scroll-margin-block: 16px }` (`#c5ff70` lime on `#080d19` navy) | CSS & Playwright keyboard navigation checks | **PASS** |
| **Modal & Drawer Focus Management (`2.1.2`, `2.4.3`)** | Mobile navigation drawer (`role="dialog"`) and Command Palette (`Ctrl+K`, `role="dialog"`) trap `Tab`/`Shift+Tab` focus, lock background body scroll, close on `Escape`, and restore focus to the invoking trigger | `site.spec.ts` (`mobile navigation traps keyboard focus and Escape restores the trigger`) | **PASS** |
| **Color Contrast (`1.4.3`, `1.4.11`)** | Primary text `#e8edf7` on `#080d19` (`> 15:1` ratio); secondary text `#9aa9c1` on `#080d19` (`> 7.2:1` ratio); accent `#c5ff70` on `#080d19` (`> 14:1` ratio); dark `#101827` text on `#c5ff70` primary buttons (`> 12:1` ratio) | Token contrast verification | **PASS** |
| **Reduced Motion (`2.3.3`)** | `@media (prefers-reduced-motion: reduce)` disables continuous animations, transitions, and scroll-reveal opacity delays (`opacity: 1 !important; transform: none !important`) | `verify-build.mjs` & `accessibility-responsive-baseline.spec.ts` | **PASS** |
| **Responsive Reflow (`1.4.10`)** | Zero horizontal document overflow (`scrollWidth <= clientWidth`) verified across `320px`, `360px`, `390px`, `430px`, `640px`, `768px`, `1024px`, `1280px`, and `1440px` viewports | `accessibility-baseline.spec.ts` & `expanded-route-responsive-audit.spec.ts` | **PASS** |
| **Dynamic Status Announcements (`4.1.3`)** | Polite live regions (`role="status"`, `aria-live="polite"`) and `role="alert"` on search result counts, clipboard copy actions, reading-list imports, and SBOM/report analyzers | `site.spec.ts` | **PASS** |
| **Article Reader Accessibility** | Accessible reading progress bar (`role="progressbar"`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow`), `<nav aria-label="Table of contents">`, `<nav aria-label="Previous and next articles">`, and labeled copy-code / filter controls (`aria-pressed`) | `site.spec.ts` | **PASS** |
