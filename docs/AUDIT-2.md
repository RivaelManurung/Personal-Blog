# Shortcomings Report — Round 2 (Updated)

## 1. Ringkasan

Kondisi round-2: sebagian perbaikan round-1 **terverifikasi benar** — transactional post writes (`CreateWithTags`/`UpdateWithTags` di `post_repo.go`), migration `000005` (indexes + `posts_published_at_check`), login/refresh rate limiters, timing-safe revalidate webhook, dan cookie session `httpOnly`/`secure` semuanya solid tanpa celah baru. Health-check gap round-1 juga beres (`/readyz` melakukan `PingContext` 2s).

Namun banyak item round-1 **masih terbuka apa adanya**: no per-request timeout middleware, no admin media list, scheduler promote masih select-then-update tanpa guard, env numerik masih unbounded, no `SetConnMaxIdleTime`, no CSP, no CI, no Docker, no backup/DR, plus semua product gap editorial (in-body images, draft preview, related posts, bulk actions, autosave).

Tema besar yang tersisa, terurut dampak:
- **Ops/delivery kosong** — tidak ada CI, containerization, backup, observability metrics. Ini pondasi yang belum ada.
- **Test coverage sangat rendah** — HTTP layer 0%, service 6.4%, scheduler/transaksi/server-actions baru semua untested; kode paling berisiko justru yang paling baru.
- **Dua regresi frontend** dari perbaikan round-1 (lihat §2).
- **Config drift environment** (port 3000 vs 3001) yang secara diam-diam mematikan seluruh jalur revalidation yang di-harden round-1.

## 2. Regressions

Ada **2 regresi frontend** — keduanya efek samping dari perubahan round-1 dan keduanya prioritas tertinggi:

1. **`force-dynamic` di category/tag pages mematikan fetch-cache** (high) — `categories/[slug]/page.tsx` dan `tags/[slug]/page.tsx` set `export const dynamic = "force-dynamic"` dengan komentar yang salah ("masih di-cache di fetch layer"). Per docs Next.js 16, `force-dynamic` = `cache: no-store` untuk **setiap** fetch di route, meng-override `revalidate: 300` dari `getCategories()`/`getPostsByCategory()`/dst. Efek: setiap kunjungan category/tag = round-trip uncached ke backend Go. Sebelum fix round-1 route ini ISR-cached (hanya punya bug soft-404). Fix: hapus `force-dynamic`, andalkan list `getCategories()`/`getTags()` yang sudah di-cache untuk memanggil `notFound()`.

2. **Penghapusan `(site)` group `loading.tsx` menghilangkan seluruh loading UX publik** (medium) — round-1 merekomendasikan per-route loading.tsx; yang diterapkan malah menghapus group-level tanpa mengganti. `loading.tsx` hanya tersisa di `(admin)/(dashboard)`. Diperparah oleh regresi #1: dua route yang jadi lebih lambat justru yang tanpa loading state — visitor lihat halaman beku/blank saat Next blocking di fetch uncached. Fix: tambah per-route `loading.tsx`/Suspense untuk `categories/[slug]`, `tags/[slug]`, `articles`, `articles/[slug]`.

## 3. Top Gaps Sekarang

| Rank | Gap | Dimension | Status | Severity | Effort |
|------|-----|-----------|--------|----------|--------|
| 1 | `force-dynamic` mematikan cache category/tag (regresi latency) | frontend | regression | high | medium |
| 2 | Port drift 3000↔3001 → revalidation webhook POST ke port mati | ops | new | high | small |
| 3 | No CI pipeline (lint/vet/test/build/audit gate) | ops | open | high | medium |
| 4 | No containerization (Dockerfile/compose/.dockerignore) | ops | open | high | medium |
| 5 | No backup / disaster-recovery (Postgres + uploads) | ops | open | high | medium |
| 6 | Backend HTTP layer 0% coverage (handlers/middleware/routes, incl. auth) | testing | open | high | large |
| 7 | Frontend server actions (auth/posts/taxonomy) 0 tests | testing | open | high | large |
| 8 | scheduler.go (baru) untested — publish loop unverified | testing | new | high | medium |
| 9 | `CreateWithTags`/`UpdateWithTags` (baru) tanpa coverage default | testing | new | high | medium |
| 10 | PostService (SetStatus/triggerReval/readingTime) untested @6.4% | testing | open | high | medium |
| 11 | No per-request timeout middleware (slow query hang request) | backend | open | high | small |
| 12 | Markdown import diam-diam buang tables & images, tanpa warning | frontend | new | high | medium |
| 13 | Editor tanpa in-body images | product | open | high | medium |
| 14 | No draft/scheduled-post preview | product | open | high | medium |
| 15 | Loading UX publik hilang total (regresi) | frontend | regression | medium | small |
| 16 | No CSP header (sanitizer satu-satunya backstop XSS) | security | open | medium | medium |
| 17 | No observability/metrics (webhook & scheduler tak terpantau) | ops | open | medium | medium |

## 4. Per Dimension

### Backend (severity desc)
- No per-request timeout middleware — **high/open** → tambah middleware `context.WithTimeout` + `c.SetUserContext`, global (kecuali upload).
- No admin media list endpoint — **medium/open** → tambah `MediaRepository.List` + `GET /admin/media`.
- Scheduler promote select-then-update tanpa guard — **low/open** → tambah `WHERE status='scheduled' AND published_at<=now()` pada UPDATE.
- Env numerik unbounded (0/negatif diterima diam-diam) — **low/open** → bounds check di `config.Load()`, fail-fast di boot.
- DB pool tanpa `SetConnMaxIdleTime` — **low/open** → `SetConnMaxIdleTime(5*time.Minute)`.
- Legacy `/health` stub berdampingan `/livez`+`/readyz` — **low/new** → hapus stub atau alias ke `/readyz`.
- ✅ Transactional writes & migration `000005` — verified-correct, no action.

### Frontend (severity desc)
- `force-dynamic` regresi cache category/tag — **high/regression** → hapus `force-dynamic`, pakai list cached untuk `notFound()`.
- Markdown import buang tables/images diam-diam — **high/new** → install `extension-table`+`extension-image` atau surface toast "N images/M tables removed".
- Loading UX publik hilang — **medium/regression** → per-route `loading.tsx`/Suspense.
- Dashboard error boundary render `error.message` mentah — **low/open** → tampilkan generic + `error.digest`.
- Cover upload tanpa validasi size/type client — **low/open** → cek `file.size`/`file.type` pre-flight.
- `qs()` terduplikasi di `client.ts` & `admin/api.ts` — **low/open** → extract ke `lib/api/query-string.ts`.
- Tiptap bundle tak di-code-split — **low/open** → `next/dynamic({ ssr:false })`.

### Testing (severity desc)
- Backend HTTP layer 0% (handlers/middleware/routes) — **high/open** → `app.Test()` + mocked service, prioritas auth middleware & rate limit.
- Frontend server actions 0 tests — **high/open** → vitest mock fetch + next/cache/navigation, assert request shape & revalidate/redirect.
- scheduler.go untested — **high/new** → fake clock + mock repo, assert due→published & stop on cancel.
- `CreateWithTags`/`UpdateWithTags` tanpa coverage — **high/new** → integration test rollback + wire `TEST_DATABASE_URL` ke CI.
- PostService untested @6.4% — **high/open** → table-driven SetStatus/readingTime/triggerReval.
- Taxonomy service revalidation untested — **medium/new** → mock Revalidator per CRUD.
- markdown.ts / MarkdownImport tanpa test — **medium/new+open** → convert+sanitize pipeline, table/image loss, XSS payload.
- No E2E (Playwright) — **medium/open** → smoke: 404 slug, skip-link, theme persist, admin CRUD.
- `/livez`+`/readyz` untested — **low/new** → 200 selalu / 503 saat ping gagal.

### Security (severity desc)
- No CSP header — **medium/open** → mulai Report-Only lalu enforce per `web/security.md`.
- Revalidate webhook tanpa rate limiting — **low/open** → IP limiter + pastikan `REVALIDATE_SECRET` 32+ byte.
- Markdown link `target=_blank` tanpa forced `rel=noopener` — **low/new** → DOMPurify `afterSanitizeAttributes` hook.
- ✅ Round-1 security fixes — verified present & correct.

### Ops / Product (severity desc)
- Port drift 3000↔3001 (webhook ke port mati) — **high/new** → samakan port + log resolved `REVALIDATE_URL` + log non-2xx webhook.
- No CI — **high/open** → workflow vet+test+cover+govulncheck / eslint+tsc+vitest+build+audit, gate merge.
- No containerization — **high/open** → multi-stage Dockerfile (+`output:'standalone'`) + compose + `.dockerignore`.
- No backup/DR — **high/open** → scheduled `pg_dump`/WAL + uploads backup + restore runbook.
- Editor tanpa in-body images — **high/open** → `extension-image` + upload handler pakai media endpoint.
- No draft/scheduled preview — **high/open** → Next.js Draft Mode + tombol Preview.
- No observability/metrics — **medium/open** → `/metrics` Prometheus + counter scheduler & webhook outcome.
- No deploy automation/runbook — **medium/open** → Makefile (migrate/seed/serve/test) + runbook.
- No related posts — **medium/open** → query shared category/tag + "read next".
- No bulk actions/quick status admin — **medium/open** → react-table row selection + inline status.
- No editor autosave/draft recovery — **medium/open** → debounced PATCH/localStorage + "last saved".
- Theme toggle hanya di public site — **low/new** → tambah ThemeToggle ke admin header + login.

## 5. Roadmap (Updated)

### Now (blocker / regresi / diam-diam rusak)
1. Fix port drift 3000↔3001 + log webhook non-2xx (revalidation sekarang mati total).
2. Hapus `force-dynamic` di category/tag pages (regresi latency).
3. Kembalikan loading UX publik (per-route `loading.tsx`/Suspense).
4. Add per-request timeout middleware.
5. Surface/atasi silent drop tables+images pada Markdown import (minimal warning).

### Next (fondasi & risiko tertinggi)
6. CI pipeline (vet/test/cover/lint/tsc/build/audit) + wire `TEST_DATABASE_URL`.
7. Test coverage berurut risiko: auth middleware & HTTP handlers → scheduler.go → `CreateWithTags`/`UpdateWithTags` → PostService `SetStatus`/`triggerReval` → server actions.
8. Containerization (Dockerfile + compose + `output:'standalone'`).
9. Backup/DR (pg_dump/WAL + uploads + restore runbook).
10. CSP (Report-Only → enforce) + `rel=noopener` hook + revalidate rate limit.
11. Config hardening: fail-fast env bounds, `SetConnMaxIdleTime`, scheduler UPDATE guard.

### Later (product & polish)
12. In-body images editor + draft/scheduled preview (Draft Mode).
13. Observability `/metrics` + counters (webhook/scheduler) + Makefile/runbook.
14. Related posts, bulk actions/quick status, editor autosave.
15. E2E Playwright smoke suite.
16. Cleanup: hapus `/health` stub, dedup `qs()`, code-split Tiptap, admin ThemeToggle, admin media list, client-side upload validation, error boundary `digest`, markdown/taxonomy unit tests.