# DreamEx Tech (`dreamex.tech` / `www.dreamex.tech`) — Laporan Audit Menyeluruh Produksi Live

**Tanggal Audit:** 17 November 2026  
**Domain Terverifikasi:** `https://dreamex.tech` & `https://www.dreamex.tech` (Desktop `1440×900`, Laptop `~1113px`, Mobile `390×844`, Tema *Obsidian Dark* & *Daylight Light*, Bahasa `EN` & `ID`)

---

## Bagian I — Data Temuan Infrastruktur & Arsitektur Awal (Tersimpan)

1. **Gerbang Anti-Bot Cloudflare Agresif (`HTTP 403 / cf-mitigated: challenge`)**:
   - Pengunjung pertama tanpa cookie verifikasi dihadang layar hitam *"Performing security verification"* milik Cloudflare.
   - **Dampak**: Meningkatkan *bounce rate* pengunjung baru, memblokir bot pratinjau gambar `og:image` (WhatsApp, LinkedIn, X, Discord), serta menghalangi akses otomatis ke `/llms.txt`, `/sitemap.xml`, `/rss.xml`, `/api/badge`, dan `/api/mcp`.
2. **Backend Kolaborasi Tim `/team-workspace` Default Nonaktif (`HTTP 503`)**:
   - Memerlukan variabel environment `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, dan `DREAMEX_WORKSPACE_TOKEN` di Vercel.
3. **Ketergantungan Kunci BYOK pada Streaming LLM Nyata**:
   - Tanpa API key pengguna di `sessionStorage`, fitur AI menjalankan sintesis deterministik lokal.
4. **Sandbox `/prototype` Berbasis Blueprint Terkurasi**:
   - Merender 4 simulasi arsitektur interaktif, belum mengompilasi kode JSX/HTML bebas di dalam *sandboxed iframe*.
5. **Monolit `src/App.tsx` (`~1.650` Baris) & Belum Adanya Bukti Sosial/Kontak Komersial**:
   - Perlu dekomposisi ke modul komponen terpisah serta penambahan studi kasus terukur atau kanal kontak/konsultasi bisnis.

---

## Bagian II — Temuan Audit Live Menyeluruh (Menu, Submenu, Desain, Responsif, Light/Dark & Seluruh Fitur)

### A. Bug Teknis & Fungsional Prioritas Tinggi (`P0`)

| Kode | Lokasi / Rute | Temuan Nyata di Produksi (`www.dreamex.tech`) | Akar Masalah & Solusi Teknis |
| :--- | :--- | :--- | :--- |
| **P0-1** | **`/grader` & `/api/grader`** | Kontradiksi skor diri sendiri: saat dibuka awal menampilkan **`99 / Grade A+`**, tetapi ketika tombol **Run Live Audit** diklik pada `dreamex.tech`, skor turun menjadi **`90 / Grade A`** dengan pesan `<main>: Missing · <h1>: Missing` (hal serupa terjadi pada `vercel.com` -> `83 / A`). | HTML statis `dist/index.html` hanya berisi `<div id="root"></div>` (landmark `<main>` & `<h1>` baru dirender oleh React di sisi klien), atau Cloudflare mengembalikan halaman perantara saat dipindai dari server. Solusi: suntikkan *prerendered semantic shell* (`<main>` + `<h1>` awal) di `prerender-routes.mjs` dan perbaiki detektor SPA di `api/grader.js`. |
| **P0-2** | **Seluruh Halaman (Console CSP Error)** | Setiap halaman memunculkan `console.error` pelanggaran CSP karena Cloudflare menyuntikkan skrip `https://static.cloudflareinsights.com/beacon.min.js` yang diblokir oleh `script-src 'self'` di `vercel.json`. | Matikan injeksi otomatis *Cloudflare Web Analytics / JS Detections* di dashboard Cloudflare, atau izinkan `https://static.cloudflareinsights.com` secara eksplisit di CSP `vercel.json`. |
| **P0-3** | **`/github-ci` (Kredibilitas Brand)** | Menampilkan metrik mencolok berwarna merah/kuning di bagian atas: **`SAMPLE CI PASS RATE: 27% (4 passed · 11 failed)`** akibat riwayat run GitHub Actions lama yang gagal. | Sangat merusak kredibilitas saat promosi platform "Self-Healing QA". Filter secara default ke branch `main` terbaru atau tampilkan rasio keberhasilan *latest workflow status* per pipeline beserta konteks yang jelas. |
| **P0-4** | **Sticky Header vs Subnav Dock (`/prototype`, `/github-ci`, `/team-workspace`)** | Saat `ACTIVE OS BLUEPRINT` aktif di `/prototype` lalu halaman di-scroll, bar `ToolRouteBreadcrumbs` tertutup sebagian oleh *sticky header* atas. Selain itu, pil judul hero di `/team-workspace` & `/github-ci` menempel/bertabrakan langsung dengan garis bawah subnav dock. | Tambahkan jarak aman (`margin-top` / `padding-top` konsisten pada `.tool-context-shell` + hero halaman dalam) dan selaraskan `top` / `z-index` antara header utama dengan subnav. |

---

### B. Kekurangan Menu, Mega-Menu, Submenu Mobile & Navigasi (`P1`)

1. **Inkonsistensi Angka Jumlah Suite & Label Versi di Seluruh Menu**:
   - Tertulis berbeda-beda di beberapa tempat: **`All Roles (22)`** di filter `/workspace`, **`All Suites (23)`** di Mega-Menu, **`24 tools / 24 suites`** di hero `/workspace`, dan **`25 AI workspaces`** di subtitle tombol `Engineering platform`.
   - Label versi tercampur aduk: `v6` / `v6.0` (`/prototype`, `/grader`), `v5`, dan sisa label lama **`Sovereign IT Suite (v3)`** serta **`QUANTUM OBSIDIAN v3.0`** di `/tools`.
2. **Kepadatan Mega-Menu Desktop (`1440×900`) & Item Yatim (*Orphan Card*)**:
   - Menampilkan 23 item sekaligus dengan *internal scrollbar* sehingga item terakhir (**`Learning Hub`**) jatuh sendirian di baris bawah sebelah kiri di bawah baris 4 kolom.
3. **Bug Drawer Navigasi Mobile (`390×844`)**:
   - **Tombol Hapus (`×`) Ganda pada Quick Find**: Input `type="search"` memunculkan ikon `×` bawaan browser bersebelahan dengan tombol `<X />` kustom React.
   - **Urutan Hasil Pencarian Terbalik**: Saat mengetik `"jira"` (`1 destination found`), kartu promosi besar `"AUTONOMOUS AI WORKSPACE · v6.0"` tetap muncul di atas hasil pencarian sehingga link hasil pencarian terdorong jauh ke bawah layar.
   - **Teks Menempel Tanpa Spasi**: Statistik pada kartu intro drawer terbaca `"01–05Agent stages"` dan `"100%Browser-first"` tanpa pemisah spasi.
   - **Ukuran Target Sentuh (`Touch Target < 44px`)**: Tombol tutup drawer (`38×38px`), tombol tema (`73×28px`), dan tombol bahasa `ID`/`EN` (`34×32px`) berada di bawah rekomendasi ergonomis `44×44px`.
4. **Filter Kategori Command Palette (`Ctrl+K`) Kurang Lengkap**:
   - Hanya menyediakan `All tools`, `QA`, `API`, `Security`, `Reliability`, dan `Learn & discover`—belum memiliki kategori khusus **`AI & Prototype`** atau **`BA & PM / Jira`**.
5. **Subnav `02 Build & Verify` Memiliki Baris Yatim**:
   - Menampilkan 9 pil sekaligus sehingga pil ke-9 (`Developer Utilities`) jatuh sendirian ke baris kedua.

---

### C. Kekurangan Desain Visual, Responsivitas Layar Menengah & Beranda (`P1`)

1. **Cacat Layout pada Ukuran Laptop Menengah (`~1024px – 1180px`)**:
   - Pada lebar sekitar `1113px`, sisi kanan kartu `HeroAiCockpit` terpotong dan keempat tab kokpit terpotong parah (`01 · Arc...`, `02 · QA ...`, `03 · BA ...`, `04 · Pro...`).
   - Bahkan pada desktop penuh `1440×900`, tab ke-3 masih terpotong menjadi **`03 · BA & Ji...`** (dan pada bahasa Indonesia tab ke-2 terpotong menjadi **`02 · QA Auto...`**).
2. **Baris Yatim pada `Role-Guided Funnel` (`START BY ROLE`) di Beranda**:
   - Pil `01` s.d. `04` berjajar dalam satu baris, sedangkan **`05 · PM Lead · Monte Carlo & Jira v3`** jatuh sendirian ke baris kedua dengan 75% ruang kosong di sebelahnya.
3. **Panjang Halaman Beranda Berlebihan (`10.248px` pada Desktop) & Pengulangan Narasi**:
   - Empat bagian berturut-turut (`HeroAiCockpit` -> `5-Agent Prototype Bento Stage` -> `NeuralAiStudio` -> `Capability Matrix`) mengulang narasi 5-Agen / USL / Gherkin / Playwright yang sangat mirip sehingga halaman terasa terlalu panjang untuk dipindai cepat.
4. **Visual Gambar Berulang & Tag `<img src="" alt="">` Tersembunyi**:
   - Beberapa kartu galeri dan artikel mendaur ulang ilustrasi abstrak 3D yang serupa, serta ditemukan elemen `<img>` kosong tersembunyi di DOM.
5. **Detail Kecil pada Seksi Artikel & Form Radar Newsletter**:
   - Terdapat **17 tombol `#tag`** untuk hanya **9 artikel** (terlalu ramai secara visual).
   - Bug tata bahasa jamak bahasa Inggris: menampilkan **`"1 articles found"`** (seharusnya `"1 article found"`).
   - Placeholder input email pada *Newsletter Radar* terpotong di ujung kanan (`"...Release & AI Rac"`) dan tombol `RSS` turun tanggung.

---

### D. Kekurangan Mode Terang (*Daylight Light Mode*) & Lokalisasi Dwibahasa (`P1–P2`)

1. **Sisa Cacat Visual pada *Daylight Light Mode***:
   - **Scrollbar Gelap di Mode Terang**: Panel Mega-Menu dan `<textarea>` di `/tools` masih menampilkan *scrollbar* hitam pekat karena `color-scheme: light` belum diterapkan secara merata pada elemen *scrollable*.
   - **Garis Belahan Tajam pada Hero `/workspace`**: Di Mode Terang, latar belakang hero `/workspace` terlihat terbelah vertikal secara kasar di belakang teks `"engineering."`, dan pil `DREAMEX AI OS / WORKSPACE` menabrak garis tepi atas kartu.
   - **Ilustrasi Gelap Kontras Keras di `/prototype`**: Gambar jaringan siber berwarna hitam pekat tampil terlalu kontras di tengah kartu putih bersih tanpa bingkai transisi lembut.
   - **Nama Tema Statis**: Halaman `/tools` tetap menampilkan badge **`QUANTUM OBSIDIAN v3.0`** walaupun pengguna sedang mengaktifkan *Daylight Light Mode*.
2. **Kebocoran Bahasa Campuran (`EN` <-> `ID`) & Format Tanggal**:
   - Di mode **Inggris (`EN`)**, atribut `aria-label` logo utama masih berbahasa Indonesia: **`"DreamEx Tech beranda"`**.
   - Di mode **Indonesia (`ID`)**, beberapa label utama masih berbahasa Inggris (`"Cari tools"` bercampur dengan `"AI ENGINEERING OS"`, dll.).
   - Di halaman baca artikel (`/blog/...`), format tanggal tidak seragam: `October 3, 2026 • Updated 2026-11-01` (menggabungkan tanggal teks Inggris dengan tanggal ISO mentah).

---

### E. Kekurangan UX pada Halaman Fitur Spesifik (`P2`)

1. **Duplikasi Rute `/tools`, `/ba-hub`, dan `/pm-jira-hub`**:
   - Ketiga rute membuka halaman `SovereignWorkbench` yang persis sama (hanya berbeda tab aktif awal `01`, `03`, `04`), sehingga pengguna yang berpindah antar-menu merasa membuka halaman kembar.
2. **Pemotongan Kata di Tengah pada Tabel `/tools` (`BOUNDARY FUZZ VECTOR`)**:
   - Kolom sempit memotong kata teknis di tengah baris: `amountMi` / `nor`, `idempote` / `ncyKey`, dan `90071992547409` / `91`.
   - Kartu KPI awal menampilkan **`SELECTOR RESILIENCE: 5/100`** secara default sehingga tampak seperti kondisi rusak/gagal saat pertama kali dibuka.
3. **Status Visual Tombol Nonaktif / Terkunci Kurang Jelas**:
   - Di `/team-workspace`, tombol `Connect & load` memiliki atribut `disabled` saat token kosong, tetapi tetap berwarna hijau neon terang seolah aktif.
   - Di `/prototype`, saat peran **`AUDITOR` (Read-Only)** dipilih, tombol `Execute Settlement Batch` tetap menyala hijau primer (sebaiknya menampilkan ikon gembok / gaya *restricted* agar konsisten dengan status RBAC).
