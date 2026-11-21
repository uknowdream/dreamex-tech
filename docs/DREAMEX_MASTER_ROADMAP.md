# 🚀 DreamEx Tech — Master Roadmap & 100% Vercel-Native Architecture (v11.0)

Dokumen ini adalah cetak biru resmi dan dokumentasi arsitektur lengkap **dreamex.tech** — dirancang khusus untuk berjalan **100% di server Vercel (tanpa VPS atau server terpisah)** dengan paritas penuh **Atlassian Jira Cloud Enterprise** dan **3-Driver Vercel Storage Engine**.

---

## 1. Status Implementasi Saat Ini (v11.0 — Live & Terverifikasi)

| Pilar | Status | Implementasi di Kode |
| :--- | :---: | :--- |
| **1. Vercel-Native 3-Driver Storage Engine** | ✅ **Selesai** | `api/_vercelStorage.js` (auto-detect: Neon Postgres → Upstash Redis → Vercel Blob → Zero-DB Sovereign) |
| **2. Jira Agile & Sprint OS (14 Tampilan + DORA)** | ✅ **Selesai** | `src/JiraEnterpriseBoard.tsx`, `src/jira/JiraProViews.tsx`, `src/jira/JiraCloudSyncPanel.tsx`, `src/jira/JiraDoraPanel.tsx` |
| **3. 2-Way GitHub PR/Issue Webhook & Importer** | ✅ **Selesai** | `api/github-webhook.js` (HMAC-SHA256 verified) + live GitHub Issues importer di tab Automation |
| **4. Cross-Suite Bridge (`/ba-hub` & `/pm-jira-hub` → `/jira`)** | ✅ **Selesai** | `src/jiraInboxBridge.ts` + tombol 1-klik di `src/SovereignWorkbench.tsx` |
| **5. Portal Konversi `/contact` + Slack/Discord Webhook** | ✅ **Selesai** | `src/ContactDemoPage.tsx` + `api/contact.js` (`CONTACT_WEBHOOK_URL`) |
| **6. Jurnal Teknis 12 Artikel ID/EN + 12/12 Code Snippets** | ✅ **Selesai** | `src/articles.ts`, `src/articleTranslations.ts`, `src/articleEnhancements.ts` |
| **7. Zero Vulnerabilities & Strict Budgets** | ✅ **Selesai** | `npm audit --omit=dev` = **0 vulnerabilities**, React Router 7, JS `< 160 KiB` gzip, CSS `< 50 KiB` gzip |

---

## 2. Strategi Database Khusus Server Vercel (Tanpa VPS!)

Karena `dreamex.tech` **hanya menggunakan Vercel**, Anda **tidak perlu menyewa VPS, tidak perlu konfigurasi Docker, dan tidak perlu mengelola server database sendiri**.

Kode `api/_vercelStorage.js` sudah dibuat **adaptif otomatis (4 jalur berurutan)** langsung dari satu **Vercel Dashboard** Anda:

### Jalur A — Zero-DB Sovereign Mode *(Aktif Otomatis Sekarang, Rp 0)*
- Tidak perlu konfigurasi apa pun.
- Data Jira tersimpan di browser (`localStorage`), sinkron `<5ms` antar-tab via `BroadcastChannel`, dan dapat dibagikan ke HP/rekan kerja lintas perangkat melalui tombol **Copy Shareable Sync URL (`?sync=...`)**.

### Jalur B — **Vercel Blob** *(Paling Praktis: 100% Produk Asli Vercel, Tanpa Daftar Akun Pihak Ketiga)*
1. Buka **Vercel Dashboard** → pilih project **`dreamex-tech`** → tab **Storage**.
2. Klik **Create Database** → pilih **Blob** → klik **Create** & hubungkan ke project.
3. Vercel otomatis menyuntikkan variabel `BLOB_READ_WRITE_TOKEN`.
4. Klik **Redeploy** → `/api/jira-sync`, `/api/contact`, dan `/api/github-webhook` otomatis berpindah ke `"activeDriver": "vercel-blob"`!

### Jalur C — **Neon Serverless Postgres** *(Rekomendasi Terbaik untuk Jira Enterprise Skala Besar, 1-Klik via Vercel Marketplace)*
1. Di **Vercel Dashboard → Storage → Create Database**, pilih **Neon (Serverless Postgres)** → pilih region **Singapore (`ap-southeast-1`)**.
2. Vercel otomatis menyuntikkan `DATABASE_URL` dan menagih/mengelola langsung di akun Vercel Anda (tersedia *Free Tier*).
3. **Zero Manual Migration**: Pada request pertama setelah **Redeploy**, `api/_vercelStorage.js` otomatis menjalankan `CREATE TABLE IF NOT EXISTS dreamex_kv_store (...)` melalui driver resmi `@neondatabase/serverless`!

### Jalur D — **Upstash Serverless Redis** *(1-Klik via Vercel Marketplace — Mengaktifkan Juga `/api/team-workspace` & `/api/radar`)*
1. Di **Vercel Dashboard → Storage → Create Database**, pilih **Upstash Redis**.
2. Vercel otomatis menyuntikkan `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`.
3. Tambahkan `TEAM_WORKSPACE_PASSCODE` (sandi 16+ karakter) jika ingin mengaktifkan `/team-workspace`.
4. Klik **Redeploy** → semua endpoint langsung aktif dengan penyimpanan Redis permanen!

### Bonus Opsional: Notifikasi Otomatis & 2-Way GitHub Sync (Di Vercel Environment Variables)
| Environment Variable | Fungsi |
| :--- | :--- |
| `CONTACT_WEBHOOK_URL` | URL Slack atau Discord Incoming Webhook — setiap form `/contact` terkirim, notifikasi langsung masuk ke HP/Slack Anda. |
| `GITHUB_WEBHOOK_SECRET` | Secret untuk `https://dreamex.tech/api/github-webhook` — saat PR berisi kode tiket (`DX-104`) dibuka/di-*merge*, status otomatis terpetakan ke Jira (`review` → `done`). |

> **Catatan Batas Vercel Hobby (Gratis)**: Vercel Hobby mendukung hingga **12 Serverless Functions** di folder `api/`. Saat ini `dreamex.tech` hanya memakai **8 dari 12 slot** (`badge`, `contact`, `github-webhook`, `grader`, `jira-sync`, `mcp`, `radar`, `team-workspace`), sedangkan `_rateLimit.js` & `_vercelStorage.js` tidak memakan kuota function.

---

## 3. Gerbang Kualitas Produksi (Wajib Lulus di Setiap Rilis)
```bash
npm audit --omit=dev
npm run typecheck
npm run lint
npm run verify:i18n
npm run verify:security
npm run test:api
npm run build
npm run verify:build
npm run smoke:production
```
