# DreamEx Tech (`dreamex.tech`) — Master Product, Design, Functional & Global Promotion Roadmap (v5.5 – v8.0)

**Dokumen Strategis & Arsitektur Sistem** · Baseline Produksi Saat Ini: **v5.0 (`4b37655`)**  
**Domain Aktif:** `https://dreamex.tech` · `https://www.dreamex.tech` · `https://dreamex-tech.vercel.app`  
**Visi Utama:** Mengubah `dreamex.tech` menjadi **Global Tier-1 Autonomous AI Engineering Operating System** setara **Linear, Vercel v0, Raycast, dan Stripe**—siap dipromosikan secara mendalam ke CTO, komunitas developer internasional, rekruiter global, mitra bisnis, dan investor.

---

## 1. Audit Jujur & Mendalam: Kekurangan Saat Ini (v5.0) yang Wajib Diperbaiki

Sebelum promosi berskala besar dijalankan, berikut adalah 6 celah teknis, UX, dan distribusi yang perlu disempurnakan:

| # | Area Audit | Kondisi Saat Ini (v5.0) | Dampak Saat Dipromosikan | Solusi Arsitektural Target |
| :--- | :--- | :--- | :--- | :--- |
| **01** | **Social Preview & Cloudflare Bot Gate** | `www.dreamex.tech` mengaktifkan *Cloudflare Managed Challenge* (`HTTP 403` bagi sebagian klien non-browser) dan belum memiliki `og:image` dinamis per halaman (`summary` kecil). | Saat link dibagikan ke LinkedIn, WhatsApp, X/Twitter, atau Discord, pratinjau kartu gambar bisa gagal dimuat atau kurang mencolok di linimasa. | Tambahkan aturan **Cloudflare WAF Allow Known Bots (`cf.client.bot`)** + bangun endpoint **`/api/og` (`@vercel/og`)** dengan `twitter:card = summary_large_image` (`1200x630`). |
| **02** | **Beban Kognitif 24+ Suite (*Cognitive Overload*)** | Mega-Menu di `src/App.tsx` menampilkan 24 suite sekaligus; sebagian tumpang tindih fungsi (`/lab` vs `/qa-studio` vs `/tools`; `/control-plane` vs `/command-center`). | Pengunjung baru dari kampanye promosi hanya punya waktu **5–8 detik** untuk menangkap nilai utama situs; terlalu banyak pilihan awal memicu kebingungan. | Buat **Role-Guided Entry Funnel** di Hero (*"Pilih Peran Anda: Architect · QA · BA · PM · Founder"*) + **Mode Tur Interaktif 60 Detik** yang memandu klik pertama secara otomatis. |
| **03** | **Silo Data Antar-Fitur (*Disconnected State*)** | Output di `src/AiPrototypeStudio.tsx`, `/ba-hub`, `/qa-studio`, dan `/pm-jira-hub` belum saling terhubung otomatis. | Pengguna harus menyalin ulang spesifikasi secara manual ketika berpindah dari tahap desain prototipe ke penyusunan tes QA atau estimasi Jira. | Bangun **Unified Project Context Bus** berbasis `IndexedDB` lokal sehingga 1 *blueprint* di `/prototype` langsung mengisi skenario Gherkin, Playwright, ADR, dan kalkulasi sprint di seluruh suite. |
| **04** | **Belum Ada Tautan Berbagi Hasil (*Shareable Permalinks*)** | Ekspor baru berupa salin teks atau unduh `.json` lokal; belum ada tombol **"Bagikan Tautan Prototipe Ini"**. | Kehilangan potensi **viralitas organik**: pengguna yang menyusun arsitektur di `dreamex.tech` belum bisa mengirim link simulasi langsung ke rekan tim atau LinkedIn. | Implementasikan **Zero-DB Compressed URL State (`#s=...`)** dan opsional *Upstash Shortlink* (`/p/:id`) agar setiap simulasi bisa dibuka ulang persis oleh penerima link. |
| **05** | **Hambatan Kunci API pada Live AI (*BYOK Friction*)** | Streaming LLM nyata di `src/aiClient.ts` mewajibkan pengunjung memasukkan API key sendiri. | Pengunjung kasual dari media sosial jarang menyiapkan API key di perangkat mobile mereka, sehingga belum merasakan kecerdasan generatif *real-time* secara instan. | Sediakan **Zero-Friction Public AI Demo Quota** (3 eksekusi gratis/hari via Vercel Edge Function + AI Gateway dengan *rate-limit* ketat), lalu arahkan ke BYOK/Pro untuk pemakaian tanpa batas. |
| **06** | **Utang Teknis CSS Awal (`48.5 KiB` / `50.0 KiB` gzip) & Monolit `App.tsx`** | `src/styles.css` + `src/spatial-ai-system.css` menyisakan ruang *budget* hanya `1.5 KiB` gzip karena ribuan override `html[data-theme="light"]`, dan `src/App.tsx` berisi `1.600+` baris. | Menyulitkan penambahan komponen visual baru di *shell* utama tanpa melanggar batas `50 KiB` gzip pada `scripts/verify-performance-budget.mjs`. | Refactor ke **OKLCH Semantic CSS Variables** murni (menghapus duplikasi `!important`) dan pecah `src/App.tsx` ke modul `src/shell/*` hingga CSS awal turun ke **`< 28 KiB` gzip**. |

---

## 2. Arsitektur Desain Generasi Berikutnya: *"Quantum Spatial Glass & OKLCH Daylight"*

### 2.1 Evolusi Bahasa Visual & Mikro-Interaksi
1. **OKLCH Perceptual Color System**: Mengganti palet hex statis dengan token `oklch(...)` sehingga kontras antara *Obsidian Singularity (Dark)* dan *Alabaster Precision (Daylight Light)* memiliki kecerahan perseptual yang presisi dan memenuhi standar **WCAG AAA** pada teks utama.
2. **Cursor-Tracked Specular Border Lighting**: Garis tepi kartu Bento merespons posisi kursor secara halus (`radial-gradient` mengikuti `--mouse-x`, `--mouse-y` di atas GPU *compositor*), menciptakan efek optik berteknologi tinggi ala **Raycast Pro** dan **Linear**.
3. **Native View Transitions API**: Memanfaatkan `document.startViewTransition()` saat berpindah dari kartu di Beranda ke `/prototype`, `/tools`, atau `/blog/:slug` sehingga elemen visual bermorfosis mulus layaknya aplikasi *native*.
4. **WebGPU / Lightweight Shader Hero Field (`< 12 KiB`)**: Menggantikan partikel Canvas 2D di `src/HeroNeuralCanvas.tsx` dengan *instanced neural flow field* berbasis WebGL2/WebGPU yang bereaksi saat pengguna mengganti tab agen (`Arch`, `QA`, `BA/Jira`, `Proto`), serta otomatis berhenti pada `prefers-reduced-motion: reduce`.

### 2.2 Konsolidasi Arsitektur Informasi (Information Architecture v6.0)
Seluruh 28 rute yang ada tetap dipertahankan demi integritas SEO, namun alur eksplorasi pengguna disederhanakan menjadi **4 Pilar Siklus Rekayasa Otonom**:
- **01 · Prototype & Architect**: `/prototype` (5-Agent Studio), `/tools` (Pilar SE), `/knowledge-graph`, `/api-playground`
- **02 · Spec & Delivery**: `/ba-hub` (Gherkin + RTM), `/pm-jira-hub` (Jira v3 + Monte Carlo), `/roadmap`, `/control-plane`
- **03 · Autonomous QA & Perf**: `/qa-studio`, `/quality-intelligence`, `/performance`, `/reliability-center`
- **04 · Zero-Trust SecOps**: `/security-center`, `/supply-chain-intelligence`, `/site-audit`, `/observatory`

---

## 3. Ide Fitur Teknologi Tinggi Baru (Diferensiator Kelas Dunia & Mesin Promosi)

### 3.1 Viral Feature #1: **AI Readiness, Security & Web Architecture Grader (`/grader`)**
- Pengunjung memasukkan URL website publik atau repositori GitHub -> Edge Function memindai *Security Headers*, CSP, metadata SEO, `llms.txt`, dan kesiapan arsitektur.
- Menghasilkan **Sertifikat Skor Interaktif (0–100, Grade A+)** + ekspor **Executive PDF** + **Dynamic SVG Badge** untuk dipasang di GitHub `README.md` atau dibagikan satu klik ke LinkedIn (menciptakan *backlink* & trafik viral otomatis ke `dreamex.tech`).

### 3.2 Flagship Feature #2: **Live Sandboxed React/UI Compiler & Full-Stack `.zip` Generator**
- Meningkatkan `/prototype` dengan *isolated sandboxed iframe previewer* yang merender modifikasi kode UI secara langsung.
- Tombol **"Download Production Starter (`.zip`)"** yang membungkus `ADR-001.md`, `requirements.feature` (Gherkin), `openapi.yaml`, `schema.zod.ts`, `smoke.spec.ts` (Playwright), dan `.github/workflows/ci.yml` dalam satu unduhan instan.

### 3.3 Ecosystem Feature #3: **DreamEx Public MCP Server (`/api/mcp`) & CLI (`npx dreamex-os`)**
- Membuka akses kalkulator skalabilitas USL, kompilator Gherkin/RTM, dan validator kontrak milik `dreamex.tech` ke ekosistem AI Coding Agents (**Google Antigravity, Cursor, Claude Code, VS Code**) melalui protokol MCP standar + menerbitkan `/llms.txt` & `/llms-full.txt` untuk mesin pencari AI (ChatGPT Search, Gemini, Perplexity).

### 3.4 Executive Feature #4: **60-Second Interactive Product Tour**
- Tombol **"▶ Tonton Tur Interaktif 60 Detik"** di Hero yang mendemokan alur 5-Agen, *Chaos Failover*, dan penghematan token AI secara otomatis dengan sorotan interaktif—menaikkan rasio konversi pengunjung baru secara drastis.

### 3.5 Collaboration Feature #5: **Shareable Architecture Permalinks & Diff Snapshots**
- Tautan terkompresi (`CompressionStream` di hash URL `#bp=...`) sehingga arsitek dapat membagikan simulasi prototipe lengkap ke WhatsApp/Slack/LinkedIn tanpa memerlukan akun atau database.

### 3.6 Authority Feature #6: **Interactive Case Studies (`/showcase`) & Press/Partner Kit (`/brand`)**
- Studi kasus rekayasa interaktif dengan grafik hidup yang dapat dimanipulasi pembaca, ditambah halaman profil kapabilitas resmi untuk mendukung penawaran kerja sama B2B, konsultasi arsitektur, atau monetisasi SaaS.

---

## 4. Tahapan Implementasi (Roadmap v5.5 – v8.0)

### Fase 1 — `v5.5`: Promotion-Ready Polish, Dynamic Social OG & CSS Refactor *(Minggu 1–2)*
- [ ] Endpoint `/api/og` untuk kartu gambar sosial dinamis `1200x630` (`summary_large_image`) di seluruh rute & artikel.
- [ ] Aturan Cloudflare WAF Allow Known Bots + publikasi `/llms.txt` & `/llms-full.txt`.
- [ ] Tombol *Shareable Permalink* (`#bp=...`) di `/prototype` dan `/tools`.
- [ ] *Role-Guided Entry Funnel* + *60-Second Interactive Tour* di Beranda.
- [ ] Refactor CSS ke OKLCH Semantic Variables (`index-*.css` turun ke `< 28 KiB` gzip) & modularisasi `src/App.tsx` ke `src/shell/*`.

### Fase 2 — `v6.0`: Viral Growth Engine, Unified Context Bus & Public AI Trial *(Minggu 3–5)*
- [ ] Rute baru `/grader` (*Public Website & GitHub AI/Security Grader* + lencana SVG viral).
- [ ] *Unified Project Context Bus* (`IndexedDB`) yang menyinkronkan data otomatis antar 24 suite.
- [ ] *1-Click Full-Stack Starter `.zip` Exporter* di `/prototype`.
- [ ] Endpoint `/api/ai-preview` dengan kuota demo AI publik gratis yang dilindungi *rate-limiter*.

### Fase 3 — `v7.0`: Spatial WebGPU UX, Live Code Sandbox & MCP Ecosystem *(Minggu 6–9)*
- [ ] *OKLCH Specular Border Lighting*, *Native View Transitions API*, dan *WebGPU Neural Shader* di Hero.
- [ ] *Live Sandboxed React/HTML Previewer* di `/prototype` + integrasi *Open in StackBlitz*.
- [ ] Rilis paket publik `npx dreamex-os` dan endpoint `/api/mcp`.
- [ ] Penambahan 12+ studi kasus interaktif baru untuk dominasi SEO teknis global.

### Fase 4 — `v8.0`: Collaborative Cloud OS & Enterprise Tier *(Minggu 10–14)*
- [ ] Login opsional via Passkeys / GitHub OAuth (mode lokal tetap gratis selamanya).
- [ ] *Real-Time Multiplayer Architecture & RTM Board* untuk kolaborasi lintas peran (SE, QA, BA, PM).
- [ ] Laporan audit berlabel khusus (*Custom Branded PDF Reports*) untuk klien korporat & monetisasi SaaS (`Free Sovereign` / `Pro Architect` / `Enterprise Team`).

---

## 5. Playbook Promosi Mendalam (Go-To-Market Checklist)

1. **Pesan Utama (*Core Positioning*)**:
   - **Global (EN)**: *"The Client-Sovereign AI Engineering OS that turns one system intent into live responsive UI prototypes, USL scalability math, Gherkin specs, Self-Healing Playwright tests, and Jira v3 payloads in seconds."*
   - **Indonesia (ID)**: *"Sistem Operasi AI Engineering berstandar internasional yang mengubah satu visi sistem menjadi prototipe UI hidup, hitungan arsitektur terdistribusi, tes QA otomatis, dan payload Jira langsung di browser."*
2. **Format Konten Kampanye Berdampak Tinggi**:
   - **Klip Demo 35 Detik (60 FPS)**: Rekam alur `/prototype` -> klik *Run 5-Agent Pipeline* -> uji *Chaos Spike Failover* -> beralih *Dark/Light Mode* -> unduh spesifikasi.
   - **Kanal Distribusi Utama**: LinkedIn (artikel arsitektur + demo `/prototype`), Product Hunt, Hacker News (*Show HN*), X/Twitter, Reddit (`r/softwarearchitecture`, `r/QualityAssurance`, `r/webdev`), serta komunitas engineering Indonesia & Asia Pasifik.
3. **Target KPI Kesempurnaan Platform**:
   - Initial CSS `< 28 KiB` gzip & Initial JS `< 98 KiB` gzip.
   - *Time-to-Value* pengunjung baru `< 6 detik`.
   - 100% tautan sosial merender kartu visual dinamis `1200x630` tanpa terblokir WAF.
   - Skor Lighthouse `100 / 100 / 100 / 100` (Performance, Accessibility, Best Practices, SEO).
