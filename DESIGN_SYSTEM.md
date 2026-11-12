# DreamEx Tech — Design System & Visual Language

**Project:** DreamEx Tech (`https://dreamex.tech`)  
**Brand Tagline:** *"Think deeper. Build smarter."*  
**Design Direction:** Premium Dark-First Editorial Technology Publication & Precision Engineering Workbench

---

## 1. Brand Visual Identity

DreamEx Tech is designed to feel authoritative, calm, technical, and scannable across long-form reading and dense engineering workflows.
- **Dark-First Foundation:** Deep navy canvas (`#080d19` / `#070b14`) that reduces eye strain during extended code and article reading.
- **Deliberate Accent Hierarchy:** High-contrast electric lime (`#c5ff70`) for primary actions, active states, and verification signals; sky blue (`#83d5ff` / `#91cfff`) for telemetry and informational badges; soft violet (`#c0a8ff`) for architectural highlights.
- **Accessible Motion:** Purposeful, short-duration (`180ms–280ms`) `transform` and `opacity` feedback with strict `@media (prefers-reduced-motion: reduce)` overrides across all stylesheets.

---

## 2. Design Tokens (`src/styles.css` & `src/design-refinement.css`)

### 2.1 Color Tokens

| Token | Value | Semantic Role |
| :--- | :--- | :--- |
| `--bg` | `#080d19` / `#070b14` | Primary page background canvas |
| `--panel` | `#10192a` / `#0e1625` | Card, workbench, and modal surface background |
| `--surface-elevated` / `--surface-raised` | `#131d30` / `#121d30` | Hover states, sticky headers, and nested panels |
| `--surface-glass` | `rgba(13, 21, 36, 0.78)` | Translucent sticky header and drawer backdrop surface |
| `--line` / `--line-soft` | `#243047` / `#2b3851` | Hairline structural borders and dividers |
| `--text` (Root color) | `#e8ecf5` / `#e8edf7` | Primary high-contrast body and heading text |
| `--muted` | `#98a6bf` / `#9aa9c1` | Secondary descriptions, metadata, and helper copy |
| `--green` | `#c5ff70` | Primary brand accent, active state, and success indicator |
| `--blue` | `#83d5ff` | Secondary technical accent, OpenAPI/SBOM telemetry |
| `--purple` | `#c0a8ff` | Tertiary architecture and AI highlight |
| `--focus-ring` | `rgba(197, 255, 112, 0.7)` | High-visibility `2px solid` keyboard focus outline |

### 2.2 Typography Scale

| Token / Element | Font Stack | Scale & Weight | Usage |
| :--- | :--- | :--- | :--- |
| `--display` (`Space Grotesk`) | `'Space Grotesk', sans-serif` | `600–700`, tight tracking (`-0.04em` to `-0.055em`) | Hero headlines, section titles, metric callouts, card headings |
| `body` (`DM Sans`) | `'DM Sans', sans-serif` | `400–600`, `14px–16px`, line-height `1.75–1.95` | Long-form editorial prose, UI descriptions, form controls |
| `--mono` (`DM Mono`) | `'DM Mono', monospace` | `400–700`, `10px–13px`, letter-spacing `0.04em–0.12em` | Eyebrows, kickers, code blocks, tags, keyboard shortcuts (`kbd`), status pills |

### 2.3 Spacing, Radii & Layout Containers

- **Primary Container (`.container`):** `width: min(1200px, calc(100% - 56px))` on desktop (`min(1240px, calc(100% - 80px))` on `>=1440px`, `calc(100% - 32px)` on mobile `<=640px`).
- **Article Reading Container (`.article-container`):** `max-width: 790px` for optimal `60–75ch` reading measure.
- **Border Radii:** `6px–8px` for tags/badges/inputs, `10px–12px` for buttons and standard cards, `14px–20px` for hero terminals, featured cards, and mobile navigation drawers.
- **Touch Target Minimums:** Interactive buttons, links, and drawer controls maintain `min-height: 44px` (`36px–42px` for compact secondary pills) with `touch-action: manipulation`.

---

## 3. Core Component Patterns

1. **Header & Responsive Navigation Drawer (`.site-header`, `#primary-navigation`):**
   - Desktop (`>1050px`): Brand mark, primary links (`Journal`, `Topics`, `About`, `Reading List`), grouped `Platform` mega-menu (`Plan & Operate`, `Quality & Testing`, `APIs, Security & Supply Chain`, `Foundations & Learning`), Command Palette trigger (`Ctrl+K`), and `ID`/`EN` language switcher.
   - Tablet & Mobile (`<=1050px`): Accessible right-hand dialog drawer (`role="dialog"`, focus trap, `Escape` dismissal, backdrop click dismissal, `/` Quick Find search with live destination counter, and bounded local-first `Recently Opened` tools).
2. **Editorial Journal Discovery (`.discovery-toolbar`, `.filter-row`, `.tag-filter-row`, `.article-card`):**
   - Search box with `/` keyboard shortcut, Sort selector (`Featured order`, `Newest first`, `Oldest first`, `Shortest read`, `Title A–Z`), Category filter tabs (`All`, `Software Engineering`, `QA Automation`, `AI & Technology`), and interactive `#tag` pills.
3. **Long-Form Article Reader (`.article-page`):**
   - Fixed top reading-progress bar (`role="progressbar"`), header with publication/update dates and editorial author role, structured Table of Contents (`.article-toc`), anchored section headings (`.article-section-heading`), reference code block with copy button (`.article-code-block`), engineering note callout (`.article-note`), action bar (bookmark, share, Markdown citation, copy link), Previous/Next sequence cards (`.article-prev-next`), and related articles grid.
4. **Stylesheet Architecture & Code Splitting:**
   - Global shell & homepage styles: `src/styles.css`, `src/design-refinement.css`, `public/premium-experience.v2.css`.
   - Co-located lazy-route stylesheets: `EngineeringRoadmap.css`, `EngineeringCommandCenter.css`, `EngineeringQualitySuite.css`, `EngineeringIntelligence.css`, `EngineeringControlPlane.css`, `QualityIntelligence.css`, `SupplyChainIntelligence.css`, `ReliabilityCenter.css`, `SiteAudit.css`, `github-integration.css`.
