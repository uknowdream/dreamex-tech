# DreamEx Tech — Technical SEO & Discovery Audit

**Audit Date:** 12 November 2026  
**Project:** DreamEx Tech (`https://dreamex.tech` / `https://www.dreamex.tech`)  
**Verification Scripts:** `scripts/generate-rss.mjs`, `scripts/prerender-routes.mjs`, `scripts/verify-seo.mjs`, `scripts/verify-prerender.mjs`

---

## 1. Executive Summary

DreamEx Tech implements build-time static metadata prerendering across **24 static routes** and **6 long-form technical articles** (**30 prerendered HTML entrypoints**), backed by an automated XML sitemap (`28` indexable canonical URLs), a validated RSS 2.0 feed with XSL styling (`/rss.xml` + `/rss.xsl`), and rich Schema.org JSON-LD structured data (`Organization`, `WebSite`, `Article`, and `BreadcrumbList`).

---

## 2. Build-Time Metadata Prerendering (`scripts/prerender-routes.mjs`)

Every public route produces a dedicated `dist/<route>/index.html` containing route-specific `<head>` tags before any client JavaScript executes:

| Metadata Tag | Implementation & Validation Rule | Status |
| :--- | :--- | :--- |
| `<title>` | Unique per route (`<Page Title> — DreamEx Tech`), verified non-duplicate across all routes | **PASS** |
| `<meta name="description">` | Route-specific summary constrained to `50–180` characters (enforced by `route-metadata.spec.ts`) | **PASS** |
| `<link rel="canonical">` | Absolute canonical URL on `https://dreamex.tech/<path>` | **PASS** |
| `og:title`, `og:description`, `og:url`, `og:type`, `og:image` | Full Open Graph social preview card (`website` for pages, `article` + `article:published_time` for blog posts) | **PASS** |
| `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` | `summary_large_image` card targeting `https://dreamex.tech/og-cover.svg` | **PASS** |
| `<meta name="robots">` | `index, follow` on 28 public canonical routes; `noindex, follow` on `/reading-list` (personalized browser-local view) and unknown 404 slugs | **PASS** |

---

## 3. Structured Data (Schema.org JSON-LD)

1. **Global Root Schema (`index.html`):**
   - `@graph` containing `Organization` (`DreamEx Tech`, `https://dreamex.tech/`, logo `/favicon.svg`, GitHub `sameAs`) and `WebSite` (`inLanguage: ['id', 'en']`).
2. **Article Schema (`ArticlePage` in `src/App.tsx`, `script[data-article-schema="true"]`):**
   - `@type: "Article"`, `headline`, `description`, `datePublished`, `dateModified` (populated from `articleEnhancements`), `author` (`Organization`), `publisher` (`Organization`), and `mainEntityOfPage`.
3. **BreadcrumbList Schema (`ArticlePage` in `src/App.tsx`, `script[data-breadcrumb-schema="true"]`):**
   - `@type: "BreadcrumbList"` with 3 `ListItem` positions:
     1. `DreamEx Tech` (`https://dreamex.tech/`)
     2. Category (`Software Engineering` / `QA Automation` / `AI & Technology` → `https://dreamex.tech/#latest`)
     3. Article Headline (`https://dreamex.tech/blog/<slug>`)

---

## 4. Crawlability, Sitemap & Syndication Feeds

| Resource | URL | Verification Details | Status |
| :--- | :--- | :--- | :--- |
| **Robots Policy** | `/robots.txt` | `User-agent: *`, `Allow: /`, `Sitemap: https://dreamex.tech/sitemap.xml` | **PASS** |
| **XML Sitemap** | `/sitemap.xml` | Generated at build time (`28` canonical `<url>` entries with `<lastmod>`, `<changefreq>`, `<priority>`); excludes `noindex` `/reading-list` | **PASS** |
| **RSS 2.0 Feed** | `/rss.xml` & `/rss.xsl` | Generated in newest-first order for all 6 articles with `<guid>`, `<pubDate>`, `<category>`, and human-friendly XSL stylesheet | **PASS** |
| **Web App Manifest** | `/manifest.webmanifest` | Installable PWA manifest with `/icon-192.png`, `/icon-512.png`, and theme color `#080d19` | **PASS** |
