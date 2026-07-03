# Laporan Kekurangan Sistem Blog — Prioritas Perbaikan

## 1. Executive Summary

Secara fungsional sistem ini sudah berjalan (backend Go/Fiber + PostgreSQL, frontend Next.js dengan ISR), tetapi tiga tema besar membuatnya belum siap produksi. **Pertama, jaring pengaman verifikasi nyaris kosong**: seluruh lapisan HTTP (auth, rate limit, handler), `AuthService`, `PostService`, `MediaService`, scheduler, dan server actions frontend tidak diuji sama sekali — persis pada batas keamanan dan invariant editorial yang paling berisiko. **Kedua, kematangan operasional (devops) minim**: tidak ada Dockerfile/compose, tidak ada CI, health check hanya stub statis, dan tidak ada strategi backup/DR untuk database maupun media lokal. **Ketiga, ada celah integritas data dan konsistensi cache**: penulisan post+tag tidak transaksional, CRUD kategori/tag tidak memicu revalidasi cache publik (konten basi hingga 5 menit), dan schema kurang CHECK constraint serta index FK. Di sisi produk, beberapa ekspektasi CMS standar hilang (gambar in-body, preview draft, related posts), dan a11y punya sejumlah pelanggaran WCAG yang jelas. Fondasinya baik; yang kurang adalah pembuktian, pengerasan, dan penyelesaian akhir.

## 2. Top 10 Gaps

| Rank | Gap | Dimension | Severity | Effort | Kenapa penting |
|------|-----|-----------|----------|--------|----------------|
| 1 | Nol tes HTTP handler/middleware (auth + rate limit + semua handler) | testing | critical | large | Batas keamanan admin panel tidak terverifikasi; regresi auth/rate-limit lolos tanpa sinyal |
| 2 | `AuthService` (Login/Refresh/Logout/ChangePassword) tak diuji | testing | critical | medium | Bug di sini = auth bypass / user enumeration; logika constant-time & token-version rawan |
| 3 | Tidak ada CI pipeline (padahal ARCHITECTURE.md mewajibkan) | devops | high | medium | Tes ada tapi tak pernah jalan otomatis; tidak ada gate lint/typecheck/build/coverage |
| 4 | Tidak ada containerization (Dockerfile/compose) | devops | high | medium | Tidak ada artifact reproducible, tidak ada parity lokal/prod, tidak bisa stand-up stack |
| 5 | CRUD kategori/tag tidak memicu revalidasi cache publik | frontend | high | small | Rename/hapus taxonomy menyisakan halaman publik basi / link 404 hingga TTL 5 menit |
| 6 | Post Create/Update + SetTags tidak dalam satu transaksi DB | backend | high | medium | Partial write: post tersimpan tanpa/ dengan tag salah; retry memicu duplikasi slug |
| 7 | Tidak ada strategi backup/DR untuk Postgres & media lokal | devops | high | medium | Disk loss atau migrasi buruk = kehilangan data permanen |
| 8 | Kolom FK di `posts` tanpa index (cover/og_image, author) | database | high | small | Hapus media = seq scan penuh + lock contention seiring pertumbuhan data |
| 9 | Tidak ada preview draft/scheduled + tidak ada gambar in-body editor | product | high | medium | Operator tak bisa embed gambar artikel atau melihat hasil sebelum publish — ekspektasi CMS dasar |
| 10 | Form error tidak terasosiasi ke input + tidak ada skip-to-content link | a11y | high | small | Pelanggaran WCAG 3.3.1/4.1.2/2.4.1; screen reader user tak tahu field invalid & harus tab seluruh nav |

## 3. By Dimension

### Backend
- **[high]** Create/Update + SetTags tak transaksional → bungkus dalam `db.Transaction(...)` via helper `WithTx`.
- **[high]** Tidak ada timeout per-request → tambahkan middleware `context.WithTimeout` (5-10s) ke `c.SetUserContext`.
- **[medium]** Query full-text search tanpa batas panjang → trim & cap `q` (mis. 200 char), 400 jika lewat.
- **[medium]** Delete kategori/tag tak revalidasi cache → panggil `reval.Trigger` seperti di `post_service.go`.
- **[medium]** Tidak ada endpoint listing media admin → tambah `MediaRepository.List` + `GET /admin/media`.
- **[low]** Env numerik menerima nilai negatif/nol diam-diam → tambah bounds check di `Load()`, fail fast.
- **[low]** Scheduler promote tidak atomik dengan SELECT-nya → tambahkan guard `WHERE status='scheduled' AND published_at<=now()`.

### Frontend
- **[high]** CRUD kategori/tag tak revalidasi cache publik → tambah `Trigger(["categories"/"tags"])` di service.
- **[high]** Halaman kategori/tag soft-404 (HTTP 200) untuk slug tak ada → validasi slug lalu `notFound()`.
- **[medium]** Input search admin tak resync dengan perubahan URL eksternal → `useEffect(() => setSearch(query), [query])`.
- **[medium]** Tidak ada `global-error.tsx` & error boundary di luar dua route group → tambah `app/global-error.tsx` + error boundary login.
- **[low]** Satu `loading.tsx` dipakai semua route `(site)` → tambah `loading.tsx` per-route sesuai bentuk halaman.
- **[low]** Helper `qs()` duplikat di dua API client → ekstrak ke `src/lib/api/query-string.ts`.
- **[low]** Error boundary dashboard bocorkan `error.message` mentah → tampilkan pesan generik + `error.digest` saja.
- **[low]** Tidak ada guard ukuran/tipe file client sebelum upload → validasi `file.size`/`file.type` sebelum submit.
- **[low]** Efek shortcut Ctrl+S re-subscribe tiap render → bungkus handler dengan `useCallback`/ref.

### Testing
- **[critical]** Nol tes HTTP handler/middleware → tes via `app.Test(httptest...)` untuk auth, rate limit, CRUD.
- **[critical]** `AuthService` tak diuji → unit test login/refresh/logout/token-version dengan fake repo.
- **[high]** Scheduler tak diuji → integration test promosi due post + capture reval trigger.
- **[high]** Logika `PostService` (selain Slugify) tak diuji → tes state machine SetStatus, Create/Update/Delete.
- **[high]** Validasi upload `MediaService` tak diuji → tes size cap, MIME allowlist, mismatch header/sniff.
- **[high]** Tidak ada tes server actions frontend → mock fetch + `next/headers`, assert payload/cookie/revalidate.
- **[high]** Tidak ada E2E → Playwright: login→publish→tampil, search, RSS/sitemap.
- **[medium]** Parser Markdown import tak diuji → tes heading/list/code + sanitize integration.
- **[medium]** `TaxonomyService` CRUD tak diuji → tes slug derivation & delete semantics.
- **[medium]** Integration test repo hanya `PostRepository` → perluas ke Admin/Category/Tag/Media repo.
- **[low]** Tidak ada tes komponen editor/admin UI → prioritaskan visual/E2E + RTL untuk validasi form.
- **[low]** Skema Zod tanpa tes boundary → assert accept valid / reject tiap field invalid.

### A11y
- **[high]** Tidak ada skip-to-content link (public & admin); admin bahkan tanpa `<main>` → tambah skip link + landmark `<main>`.
- **[high]** Error form tak terasosiasi ke input → tambah `aria-invalid` + `aria-describedby` + `role="alert"`.
- **[medium]** Select/editor body tak terkait `<Label>` → beri `aria-label`/`aria-labelledby` eksplisit.
- **[medium]** Kontras teks pill kategori tak terjamin di atas cover foto → pakai background solid ter-audit atau teks ≥14px bold.
- **[medium]** Hasil search dinamis tak diumumkan ke screen reader → bungkus dengan `aria-live="polite"`.
- **[low]** Link ganda per article card → jadikan `CircleArrowButton` dekoratif (`aria-hidden`, `tabIndex=-1`).
- **[low]** Insert link editor pakai `window.prompt()` → ganti dengan `Dialog` accessible.
- **[low]** Error boundary tanpa heading nyata & tak manage focus → pakai `<h1>` + set focus/`aria-live`.
- **[low]** Toggle nav mobile tanpa `aria-controls`; `aria-current` tidak konsisten → tambah `aria-controls`, standarkan `aria-current="page"`.

### Performance
- **[medium]** List post ambil full row (TEXT content + tsvector) → `Select()` khusus tanpa Content, `Distinct("posts.id")`.
- **[medium]** Tidak ada kompresi response HTTP → tambah `compress.New(...)` ke middleware Fiber.
- **[low]** `Stats` = 4 COUNT round-trip → gabung jadi satu query dengan `FILTER (WHERE ...)`.
- **[low]** ILIKE leading-wildcard admin search tanpa index → rute ke FTS atau index `pg_trgm` (lihat DB).
- **[low]** Bundle Tiptap tak di-code-split → bungkus `RichTextEditor` dengan `next/dynamic({ ssr:false })`.

### Database
- **[high]** FK `posts` tanpa index (cover/og_image, author) → migrasi baru `CREATE INDEX` partial.
- **[high]** Tidak ada CHECK konsistensi status/published_at → `CHECK (status<>'published' OR published_at IS NOT NULL)`.
- **[medium]** tsvector meng-index HTML mentah, bukan plain text → kolom plain-text terpisah untuk generate search_vector.
- **[medium]** Admin ILIKE leading-wildcard tanpa index pendukung → reuse `search_vector` atau `pg_trgm` GIN (sama dgn performance).
- **[low]** Bahasa FTS hardcoded 'english' tanpa negosiasi → dokumentasikan intensi atau tambah kolom language.
- **[low]** Extension `pgcrypto` tak terpakai, tak di-drop → hapus atau dokumentasikan; lengkapi down migration.
- **[low]** Tidak ada guard numerik non-negatif → `CHECK (reading_time_min>0)`, `size_bytes/width/height>=0`.
- **[low]** Pool tanpa `SetConnMaxIdleTime` → set ~5 menit agar idle conn di-recycle sebelum proxy timeout.

### Security
- **[medium]** Tidak ada Content-Security-Policy di mana pun → tambah CSP (mulai Report-Only), sesuai `web/security.md`. *(Duplikat dengan temuan devops CSP — satu isu.)*
- **[low]** Markdown import lewatkan HTML mentah via `marked` sebelum DOMPurify → tandai call site XSS-critical + regresi test.
- **[low]** Webhook `REVALIDATE_SECRET` tanpa rate limit → tambah rate limit IP/WAF + syarat entropy secret.
- **[low]** Placeholder `change-me` di `.env.local` → pastikan gitignored + tolak placeholder di non-dev.

### DevOps
- **[high]** Tidak ada containerization → multi-stage Dockerfile + compose (backend/frontend/postgres) + `.dockerignore`.
- **[high]** Tidak ada CI → workflow lint/vet/typecheck/test/build + govulncheck/npm audit, gate merge.
- **[high]** Health endpoint stub tanpa cek DB → pisah `/livez` & `/readyz` (PingContext).
- **[high]** Tidak ada backup/DR → jadwalkan `pg_dump`/WAL + backup uploads + runbook restore.
- **[medium]** Tidak ada observability (metrics/tracing) → `/metrics` Prometheus + counter scheduler/webhook.
- **[medium]** Tidak ada secret management prod → dokumentasikan injeksi via secret manager + rotasi.
- **[medium]** Tidak ada automation/runbook deploy → Makefile migrate→seed→serve + config reverse-proxy/TLS.
- **[medium]** Tidak ada CSP header → *(sama dengan temuan security di atas — konsolidasikan)*.
- **[low]** Tidak ada healthcheck/graceful-shutdown parity frontend → tambah HEALTHCHECK + restart policy setelah containerized.

### Product
- **[high]** Tidak ada gambar in-body editor (cover-only) → tambah `@tiptap/extension-image` + upload handler + izinkan `<img>` di bluemonday.
- **[high]** Tidak ada preview draft/scheduled → Next.js Draft Mode atau preview-token endpoint + tombol Preview.
- **[high]** Tidak ada related posts / "read next" → query related by category/tag + section di bawah artikel.
- **[medium]** CTA newsletter non-fungsional → implement email capture atau hapus/relabel CTA.
- **[medium]** Tabel posts admin tanpa bulk action & quick status → tambah row selection + quick status via endpoint yang ada.
- **[medium]** Tidak ada duplikasi post → aksi Duplicate membuat draft copy via create endpoint.
- **[medium]** Tidak ada autosave editor → debounced PATCH / localStorage draft + indikator "last saved".
- **[low]** RSS hanya excerpt → tambah `content:encoded` + author, pertimbangkan feed per-taxonomy.
- **[low]** Halaman paginasi self-canonical ke page 1 → `generateMetadata` sertakan nomor page di canonical/title.
- **[low]** Tidak ada surface profil author → blok bio/avatar dari record admin di About & byline artikel.

## 4. Recommended Roadmap

### Now (severity tinggi, effort kecil-menengah — kerjakan lebih dulu)
- Bungkus Create/Update + SetTags dalam transaksi DB *(backend, high)*.
- Tambah revalidasi cache pada CRUD kategori/tag + delete taxonomy *(frontend/backend, high/medium)*.
- Perbaiki soft-404 halaman kategori/tag → `notFound()` *(frontend, high)*.
- Migrasi index FK `posts` + CHECK constraint status/published_at *(database, high)*.
- Split health check `/livez` & `/readyz` dengan ping DB *(devops, high)*.
- A11y quick wins: skip-to-content link + asosiasi error form (`aria-invalid`/`aria-describedby`) *(a11y, high)*.
- Timeout per-request + cap panjang query search *(backend, high/medium)*.

### Next (severity tinggi tapi effort besar, atau medium bernilai tinggi)
- Bangun CI pipeline (lint/typecheck/test/build + audit) *(devops, high)* — prasyarat agar tes lain bernilai.
- Containerization: Dockerfile multi-stage + docker-compose + `output: standalone` *(devops, high)*.
- Tes lapisan HTTP/middleware + `AuthService` *(testing, critical)* — begitu CI siap.
- Tes scheduler, `PostService`, `MediaService`, server actions frontend *(testing, high)*.
- Strategi & skrip backup/DR + runbook *(devops, high)*.
- Preview draft + gambar in-body editor + related posts *(product, high)*.
- CSP header (Report-Only → enforce) *(security/devops, medium — dedup)*.

### Later (severity rendah / peningkatan bertahap)
- E2E Playwright & visual regression *(testing, high tapi setelah fondasi CI/container)*.
- Optimasi query list (Select ramping), kompresi HTTP, aggregate Stats, code-split Tiptap *(performance)*.
- Observability (metrics/tracing), secret management prod, automation deploy/runbook *(devops, medium)*.
- Autosave, bulk action, duplikasi post, RSS full-content, canonical paginasi, author profile *(product, medium/low)*.
- Sisa a11y low (link ganda, prompt→Dialog, aria-current), guard schema/env, `pgcrypto` cleanup, `SetConnMaxIdleTime` *(low)*.

**Catatan dedupe:** temuan CSP muncul di dimensi security dan devops — perlakukan sebagai satu pekerjaan. ILIKE admin leading-wildcard muncul di performance dan database — satu perbaikan (reuse FTS atau `pg_trgm`). Revalidasi taxonomy muncul sebagai delete-path (backend) dan CRUD umum (frontend) — selesaikan sekaligus di service layer.