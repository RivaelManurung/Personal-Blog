# Blog Platform — Unified Implementation Plan

**Stack (locked):** Go 1.26 · Fiber v2 · PostgreSQL · GORM (queries) + golang-migrate (schema) // Next.js 16.2 · React 19.2 · Tailwind v4 · shadcn/ui · Tiptap. Single Next app hosts both the public `(site)` blog and the `(admin)` panel.

---

## 1. Overview & Architecture

The product is a personal editorial blog: a fast RSC-first public site (AshGray design system), a client-heavy admin island behind JWT auth, and a Go/Fiber/Postgres API. One frontend deployment, one backend deployment, one Postgres.

### Repo layout

```
Blog/
├── backend/                         # Go / Fiber / Postgres API  (origin: api.blog.example.com)
│   ├── cmd/
│   │   ├── server/main.go           # bootstrap + graceful shutdown + DI
│   │   ├── migrate/main.go          # golang-migrate runner
│   │   └── seed/main.go             # idempotent single-admin seed
│   ├── internal/
│   │   ├── config/  database/  models/  dto/
│   │   ├── repository/  service/  handlers/  middleware/  validator/  routes/
│   ├── migrations/                  # 000001..000004 *.up.sql / *.down.sql
│   ├── storage/uploads/             # local media (gitignored)
│   └── .env.example
│
└── frontend/                        # Next.js 16 — public + admin (origin: blog.example.com)
    └── src/
        ├── app/
        │   ├── layout.tsx           # root: fonts, metadataBase, providers, WebSite JSON-LD
        │   ├── globals.css          # @import tailwindcss + @theme (AshGray tokens)
        │   ├── robots.ts  sitemap.ts  opengraph-image.tsx  not-found.tsx
        │   ├── feed.xml/route.ts    atom.xml/route.ts
        │   ├── api/revalidate/route.ts     # webhook target (shared-secret) -> revalidateTag
        │   ├── (site)/              # public blog — RSC-first, PPR
        │   │   ├── layout.tsx  page.tsx  loading.tsx  error.tsx
        │   │   ├── articles/page.tsx  articles/[slug]/{page,opengraph-image,loading}.tsx
        │   │   ├── categories/page.tsx  categories/[slug]/page.tsx
        │   │   ├── tags/[slug]/page.tsx  about/page.tsx  search/page.tsx
        │   └── (admin)/admin/       # admin island — client-heavy, behind auth
        │       ├── layout.tsx       # AUTHORITATIVE auth gate (Server Component) + Sidebar
        │       ├── page.tsx  login/page.tsx
        │       ├── posts/{page,new/page,[id]/edit/page}.tsx
        │       ├── taxonomy/page.tsx  settings/page.tsx
        ├── proxy.ts                 # Next 16 "middleware" — optimistic redirect only
        ├── components/{ui, layout, article-card, bento, article, filters, search, seo, admin}
        ├── features/{auth, posts, taxonomy, media}/
        ├── lib/{api, seo, feed, format, config, sanitize.ts, api-client.ts}
        ├── hooks/  styles/{tokens.css, typography.css}
        └── types/api.ts
```

### Request topology

```
                 ┌────────────────────────── frontend (Next 16) ──────────────────────────┐
  Reader ──────▶ │  (site) RSC pages ── lib/api/* (server-only fetch, 'use cache') ─┐      │
                 │                                                                    │      │
  Admin  ──────▶ │  (admin) pages ── Server Actions / api-client.ts (Bearer) ───────┤      │
                 │        │ httpOnly cookies: admin_session (access), admin_refresh   │      │
                 │  proxy.ts optimistic gate · /admin/layout.tsx authoritative gate   │      │
                 └────────┼───────────────────────────────────────────────┼─────────┘      │
                          │                                                 │                │
                          ▼  (server-to-server, private BACKEND_URL)        ▼                │
        ┌───────────────────────────── backend (Go / Fiber) ────────────────────────────────┐
        │  routes: /api/v1/{public reads} · /api/v1/auth/* · /api/v1/admin/* (RequireAuth)    │
        │          /rss.xml /atom.xml /sitemap.xml /robots.txt (non-JSON)                     │
        │  handlers ─▶ services (slug, publish-gate, argon2, feeds, media) ─▶ repositories    │
        │  middleware: requestid · slog · ratelimit · cors(credentials) · RequireAuth(JWT)    │
        └──────────────────────────────────────┬─────────────────────────────────────────────┘
                                                ▼
                                         PostgreSQL (citext, tsvector/GIN, FKs)
        publish/update ──▶ backend fires POST frontend /api/revalidate (secret) ──▶ revalidateTag
```

**Two feed/SEO sources, deliberately:** Next generates `sitemap.xml`, `robots.txt`, `feed.xml`, `atom.xml`, and all `<head>`/JSON-LD (it owns the public URLs). The backend *also* exposes `/rss.xml` `/sitemap.xml` for direct API/tooling consumers. **The Next-generated ones are canonical for the public site.** Backend feed endpoints are optional/secondary — build them only if a non-web consumer needs them (deferred to M6, not blocking).

---

## 2. Reconciled Data Model + Shared API Contract

### 2.1 Mismatches found and resolved (authoritative decisions)

| # | Conflict | Resolution |
|---|----------|------------|
| 1 | Backend uses `/api/v1/*`; both FE docs use `/api/*` | **`/api/v1/*` everywhere.** FE `lib/config/site.ts` sets `API_BASE_URL=…/api/v1`. |
| 2 | Public post URL `/articles/[slug]` vs admin folder sketch `posts/[slug]` | Public reader route is **`/articles/[slug]`**. Admin post *editor* routes stay `/admin/posts/*`. |
| 3 | Auth: backend sets refresh cookie itself; admin doc has Next set `admin_session`/`admin_refresh` cookies | **Backend is cross-origin from Next, so it must NOT set cookies.** `POST /api/v1/auth/login` returns **both tokens in JSON body**. The Next Server Action sets both as httpOnly cookies on the Next origin (`admin_session`=access, `admin_refresh`=refresh). |
| 4 | Session length: backend 15m access + 7d refresh; admin doc "7-day sliding session" | **Access 15m, refresh 7d.** The "sliding session" = api-client 401→refresh→retry. Not a 7-day access token. |
| 5 | Admin app separate vs same | **Same Next app, `(admin)` route group.** |
| 6 | Fonts: design system Fraunces+Inter; public-FE token draft Geist+serif | **Fraunces (display) + Inter (sans)** via `next/font/google`. Drop Geist. |
| 7 | `published` bool vs `status` enum + `published_at` | **`status` enum (`draft|scheduled|published`) + `published_at`.** Admin `Switch` maps to status; `Calendar` sets `published_at`. FE `types/api.ts` uses `status`, never `published`. |
| 8 | Post list envelope has no pagination `meta` | **Extend envelope with optional `meta`.** List endpoints return `{success,data,error,meta:{page,limit,total,totalPages}}`. |
| 9 | Media response needs `blurDataURL`/LQIP for `next/image` `placeholder="blur"` | **Add `blur_data_url TEXT` to `media`**; media DTO returns `url,width,height,altText,blurDataURL`. |
| 10 | Content format: HTML vs Tiptap JSON | **Store sanitized HTML** in `content` (`content_format='html'`). Tiptap emits HTML; sanitize on Go write (bluemonday) AND at FE render (isomorphic-dompurify). |
| 11 | Slug conflict signaling | Backend returns **409** using a Postgres error-code check (`pgconn.PgError.Code == "23505"`), not `strings.Contains`. FE maps 409 → inline slug field error. |
| 12 | Public search caching + canonical | `/search` is dynamic, in `<Suspense>`, `robots` disallows `/search` and it canonicalizes to `/articles`. |

### 2.2 Data model (canonical — defined in SQL migrations)

Tables exactly as the backend doc specifies, with these additions/confirmations:
- `admin_users`(id, email `CITEXT UNIQUE`, password_hash, display_name, token_version, last_login_at, timestamps)
- `categories`(id, name, slug, description, timestamps) — post N–1 category
- `tags`(id, name, slug, created_at) + `post_tags`(post_id, tag_id, PK both) — M–N
- `media`(id, filename, original_name, mime_type, size_bytes, width, height, **blur_data_url**, alt_text, url, created_at)
- `posts`(id, title, slug `UNIQUE`, excerpt, content, content_format `DEFAULT 'html'`, cover_image_id→media, category_id→categories, author_id→admin_users NOT NULL, **status** `DEFAULT 'draft'`, published_at, reading_time_min, seo_title, seo_description, og_image_id→media, canonical_url, search_vector `tsvector GENERATED`, timestamps)
- Indexes: GIN on `search_vector`; `(status, published_at DESC)`; `(category_id)`; `UNIQUE(slug)`; `post_tags(tag_id)`.
- FK deletes: media refs `ON DELETE SET NULL`; category ref `ON DELETE SET NULL`; `post_tags` `ON DELETE CASCADE`.
- **Publish gate (single definition, used by every public read):** `status='published' AND published_at IS NOT NULL AND published_at <= now()`.

### 2.3 Shared API contract (single source of truth — build FE Zod + Go DTOs to this)

Envelope: `{ "success": bool, "data": T|null, "error": string|null, "meta"?: {page,limit,total,totalPages} }`

**Public (no auth), base `/api/v1`:**
```
GET  /posts?page=&limit=&category=&tag=&sort=      -> Paginated<PostSummary>
GET  /posts/:slug                                   -> PostDetail   (published-gated)
GET  /categories                                    -> Category[]  (+postCount)
GET  /categories/:slug/posts?page=&limit=           -> Paginated<PostSummary>
GET  /tags                                          -> Tag[]        (+postCount)
GET  /tags/:slug/posts?page=&limit=                 -> Paginated<PostSummary>
GET  /search?q=&page=&limit=                         -> Paginated<SearchHit>  (snippet+rank)
GET  /media/:id                                     -> Media
```
`limit` default 10, cap 50. `page` default 1.

**Auth, base `/api/v1/auth`:**
```
POST /login    {email,password}      -> { accessToken, refreshToken, expiresAt, admin:{id,email,displayName} }
POST /refresh  {refreshToken}|cookie -> { accessToken, refreshToken, expiresAt }
POST /logout                          -> {} (bumps token_version)
GET  /me        (Bearer)             -> Admin
PUT  /password  (Bearer)             -> {}
```

**Admin (Bearer access token), base `/api/v1/admin`:**
```
GET    /posts?status=&q=&page=&limit=&sort=   -> Paginated<PostAdminSummary>   (incl. drafts/scheduled)
GET    /posts/:id                              -> PostDetail
POST   /posts                                   -> PostDetail
PUT    /posts/:id                               -> PostDetail
PATCH  /posts/:id/status  {status,publishedAt} -> PostDetail
DELETE /posts/:id
POST   /categories · PUT /categories/:id · DELETE /categories/:id
POST   /tags · PUT /tags/:id · DELETE /tags/:id
POST   /media  (multipart file, altText)       -> Media   {url,width,height,blurDataURL,altText}
DELETE /media/:id
GET    /stats                                   -> {total,published,drafts,scheduled}   (dashboard)
```

**DTO shapes (FE `types/api.ts` + `lib/api/schemas.ts` Zod ↔ Go `internal/dto`):**
```ts
PostSummary   = { id, title, slug, excerpt, coverImage: Media|null, category: Category|null,
                  tags: Tag[], readingTimeMin, publishedAt, index? }
PostDetail    = PostSummary & { content /*sanitized HTML*/, contentFormat,
                  seoTitle, seoDescription, canonicalUrl, ogImage: Media|null,
                  author:{displayName}, status, updatedAt }
Media         = { id, url, width, height, blurDataURL, altText }
Category      = { id, name, slug, description?, postCount? }
Tag           = { id, name, slug, postCount? }
SearchHit     = { id, title, slug, excerpt, snippet, rank }
Paginated<T>  = { items: T[], page, limit, total, totalPages }   // maps from data + meta
```

**Cache invalidation webhook:** backend on publish/update/delete `POST`s `frontend /api/revalidate` with header `x-revalidate-secret` and body `{tags:["posts","post:<slug>","category:<slug>","tag:<slug>"]}`. FE handler validates secret, calls `revalidateTag` per tag.

---

## 3. Consolidated Design System Tokens (final — AshGray)

Design-system doc is authoritative (the public-FE token draft was a placeholder and is superseded). Runtime source of truth lives in `styles/tokens.css` (`:root` + `[data-theme="dark"]`); `globals.css` maps them via Tailwind v4 `@theme inline` referencing `var()`.

- **Color (oklch):** surfaces `--surface / -raised / -sunken` (warm paper, never `#fff`); ink `--ink / -muted / -faint / -inverse` (warm near-black, never `#000`); accent `--accent / -strong / -contrast` (beige/taupe); category tints `--cat-life|culture|mind|travel|craft|default`; `--overlay-scrim`, `--border / -strong / -onphoto`, `--focus-ring`. Full oklch values per the design spec. Dark theme is **opt-in via `[data-theme="dark"]`**, never `prefers-color-scheme`; a no-flash inline script sets the attribute before paint.
- **Category mechanism (the anti-template lever):** each card carries `data-category`; CSS resolves one `--cat` token that drives both the pill fill and the photo scrim via `color-mix(in oklch, var(--cat) 85%, transparent)`. Never hardcode per-card colors in JSX.
- **Type:** `--font-display: Fraunces` (opsz/SOFT/WONK, italic allowed for one emphasis word, never uppercase), `--font-sans: Inter` (pills/meta/nav, uppercase + `--tracking-caps`, `tnum` for index numbers). Fluid clamp scale `--text-hero → --text-xs` per spec. Load exactly these two families, `display:swap`, preload the display weight.
- **Space/Radius/Shadow/Motion:** 4px base spacing + fluid `--space-section`/`--gutter`; radius triad only — `--radius-pill` (chips/nav/CTA), `--radius-2xl` (cards), `--radius-3xl` (hero); warm low-spread shadows `--shadow-xs…lg` (no hard black); motion `--dur-fast|normal|slow` + `--ease-out-expo/-soft`, zeroed under `prefers-reduced-motion`. Animate only `transform/opacity/filter/clip-path`.
- **shadcn note:** run `shadcn init` with base color neutral, then **override** its generated `--background/--foreground/--primary` etc. to reference AshGray tokens so admin chrome shares the palette and never looks like a stock template.

---

## 4. Phased Build Plan

Dependency order: **backend contract + auth first → public FE → admin FE → hardening.** Each milestone ends green (tests pass, `go test -race -cover ./...`, `gosec`, FE typecheck/lint/build).

### M0 — Foundations & hygiene
- [ ] Add `.gitignore`: `backend/bin/`, `backend/storage/uploads/`, `*.env` (keep `.env.example`); remove checked-in `backend/bin/server`.
- [ ] Backend: add deps — `golang-jwt/jwt/v5`, `go-playground/validator/v10`, `golang-migrate/migrate/v4`, `microcosm-cc/bluemonday`, promote `golang.org/x/crypto` (argon2). (`google/uuid` already present.)
- [ ] Frontend: add deps — `zod`, `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-table`, `@tanstack/react-query`, `lucide-react`, `date-fns`, `sonner`, `isomorphic-dompurify`, `@tiptap/react`+`@tiptap/starter-kit`+extensions.
- [ ] Configure hooks (format → eslint → `tsc --noEmit --incremental` → build) and CI wiring: `go vet`, `gosec`, `staticcheck`, `go test -race -cover`, FE `lint`+`build`.
- [ ] Read `frontend/AGENTS.md` + `node_modules/next/dist/docs/` before any Next 16 code (Cache Components, async `params`, `proxy.ts`).

### M1 — Backend schema, layering & migrations
- [ ] `internal/config/config.go`: add `APP_ENV, JWT_SECRET, ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL, ADMIN_EMAIL, ADMIN_PASSWORD, STORAGE_DRIVER, STORAGE_PATH, PUBLIC_BASE_URL, REVALIDATE_URL, REVALIDATE_SECRET, RATE_LIMIT_RPS, LOG_LEVEL, MEDIA_MAX_BYTES`. Fail-fast: require `JWT_SECRET`+`PUBLIC_BASE_URL` when `APP_ENV=production`.
- [ ] `migrations/000001_init_posts` … `000004_fts_search_vector` (up/down): citext ext, all tables, FKs, generated `search_vector`, GIN + partial indexes.
- [ ] `cmd/migrate/main.go` (up/down/version) via golang-migrate.
- [ ] `internal/database/database.go`: pool tuning (`SetMaxOpenConns(25)`, `SetMaxIdleConns(5)`, `SetConnMaxLifetime(30m)`); gate `AutoMigrate` behind `APP_ENV=development` only.
- [ ] `internal/models/{post,category,tag,media,admin_user}.go` — mirror SQL; `SearchVector` marked `gorm:"->;type:tsvector" json:"-"`.
- [ ] `internal/repository/{post,category,tag,media,admin}_repo.go` — interfaces + GORM impls; `isUniqueViolation` rewritten to check `pgconn` code `23505`.
- [ ] Extend `internal/handlers/response.go`: add optional `Meta` field; keep `ok`/`fail` helpers.
- [ ] `internal/dto/{post,auth}_dto.go` + `internal/validator/validator.go` (go-playground wrapper).

### M2 — Backend services, auth & middleware
- [ ] `internal/service/auth_service.go`: argon2id hash/verify (m=64MB,t=3,p=2), always-hash on unknown email (anti-enumeration), JWT issue/verify (access 15m/refresh 7d, `tv` claim), token_version revoke.
- [ ] `internal/middleware/{auth,ratelimit,requestid,logging}.go`: `RequireAuth` (Bearer, type=access, tv match); slog JSON (never log tokens/passwords/Authorization); global limiter + strict `/auth/login` limiter (5/15min/IP).
- [ ] `internal/service/post_service.go`: slugify (port existing), publish-gating query, reading-time, bluemonday sanitize on content, tag sync; fire revalidate webhook on publish/update/delete.
- [ ] `internal/service/media_service.go`: MIME allowlist (`jpeg|png|webp|avif`) + max-size validation, hashed filename, extract width/height, generate `blur_data_url` (tiny base64 LQIP), local storage driver.
- [ ] `internal/handlers/{auth,post,taxonomy,media}_handler.go` — thin; refactor existing `post_handler.go` to call services; standardize status codes (400/401/403/404/409/422/500, generic 500 message + logged detail).
- [ ] `internal/routes/routes.go`: versioned groups — public reads, `/auth`, `/admin` (RequireAuth). Tighten CORS: strict allowlist from `CORS_ORIGINS`, `AllowCredentials:true`, never `*`.
- [ ] `cmd/seed/main.go` (idempotent admin upsert) + boot-time "ensure admin exists" guard.
- [ ] `cmd/server/main.go`: DI wiring + graceful shutdown (SIGTERM, `ShutdownWithContext(10s)`, close DB pool).
- [ ] Tests: unit (slug, publish-gate, reading-time, argon2 round-trip, token issue/verify); integration via `testcontainers-go` (FTS ranking, pagination bounds, slug-conflict 409, auth valid/expired/wrong-type/revoked-tv); API flow login→draft→schedule→publish→appears in public list. ≥80%.

### M3 — Frontend foundation & design system
- [ ] Delete boilerplate `page.tsx`/dark `@media` block; replace `globals.css` with `@import "tailwindcss"` + `@custom-variant dark` + `@theme inline` mapping; add `styles/tokens.css` + `styles/typography.css`.
- [ ] `app/layout.tsx`: Fraunces+Inter via `next/font/google`, `<html lang>`, `metadataBase`, base metadata + title template, WebSite/Organization JSON-LD, no-flash theme script, providers (React Query).
- [ ] `next.config.ts`: `cacheComponents: true`, `images.remotePatterns` for backend media host.
- [ ] `lib/config/site.ts` (SITE_URL/NAME/social/nav), `lib/format/date.ts`, `lib/sanitize.ts` (DOMPurify wrapper).
- [ ] `lib/api/client.ts` (`import "server-only"`, envelope unwrap, typed errors, `API_BASE_URL`), `lib/api/schemas.ts` (Zod per §2.3), `lib/api/{posts,taxonomy,search}.ts` with `'use cache'`/`cacheLife`/`cacheTag` colocated.
- [ ] `types/api.ts` shared shapes (single source; admin re-imports).

### M4 — Public site (AshGray)
- [ ] Design components: `components/article-card/*` (ArticleCard, CategoryPill, DatePill, IndexNumber, ViewArrowButton), `components/bento/*` (BentoGrid, HeroFeatureCard, StackedCards, IntroBlock), `components/layout/*` (PillNav, SiteFooter, SocialIcons, JoinNowButton), `components/ui/*` (Prose, Skeleton, Container, CircleButton), `hooks/use-reduced-motion.ts`.
- [ ] `(site)/layout.tsx` (pill nav + footer), `(site)/page.tsx` home bento (`getFeaturedPosts`, hero `priority`+`fetchPriority=high`).
- [ ] `(site)/articles/page.tsx` (paginated, `<Suspense>` streamed pages), `articles/[slug]/page.tsx` (`generateStaticParams` + PPR fallback, `getPost` via React `cache()`, sanitized `ArticleBody`), `+ opengraph-image.tsx` (next/og, AshGray palette), `loading.tsx`.
- [ ] `(site)/categories/page.tsx`, `categories/[slug]/page.tsx`, `tags/[slug]/page.tsx`, `about/page.tsx`.
- [ ] `(site)/search/page.tsx` — dynamic, `searchParams.q` inside `<Suspense>`; `SearchBox` (client, debounced) + `SearchResults`.
- [ ] SEO: `generateMetadata` per post (canonical, OG `type:article`, twitter card); `components/seo/JsonLd.tsx` + `lib/seo/json-ld.ts` (BlogPosting + BreadcrumbList + WebSite/SearchAction); `app/sitemap.ts`, `app/robots.ts` (disallow `/api/`,`/search`), `app/feed.xml/route.ts`, `app/atom.xml/route.ts`, `app/opengraph-image.tsx`, `not-found.tsx`, `(site)/error.tsx`.
- [ ] `app/api/revalidate/route.ts` (secret-guarded → `revalidateTag`).
- [ ] Tests: Playwright visual at 320/768/1024/1440 + both themes; a11y (keyboard, reduced-motion, contrast); Lighthouse against home + article (budgets §5). Vitest for `lib/api` transforms + date/sanitize utils.

### M5 — Admin panel
- [ ] `shadcn init` (new-york, neutral, RSC) + `add` the component set; override generated CSS vars to AshGray tokens; `components.json` aliases.
- [ ] `proxy.ts` (matcher `/admin/:path*`, optimistic redirect if no `admin_session`).
- [ ] `features/auth/{schema,actions,api}.ts`: `loginAction` (POST Go login → set `admin_session`+`admin_refresh` httpOnly cookies → redirect), `logoutAction`, password change; `(admin)/admin/login/page.tsx` (RHF+zod).
- [ ] `(admin)/admin/layout.tsx` — **authoritative gate**: read cookie, call `GET /auth/me`, redirect on failure; `components/admin/AppSidebar` + Breadcrumb.
- [ ] `lib/api-client.ts` — Bearer from cookie, envelope unwrap, typed `ApiError`, 401→refresh→retry once then redirect. `lib/query-client.ts`, `lib/session.ts`.
- [ ] `(admin)/admin/page.tsx` dashboard (stat Cards from `/admin/stats`, recent Table).
- [ ] `(admin)/admin/posts/page.tsx` — DataTable (`@tanstack/react-table`), URL-state filters (`?q=&status=&category=&page=&sort=`), row actions (Edit/Duplicate/Delete via AlertDialog), TanStack Query optimistic delete.
- [ ] `features/posts/components/PostEditor.tsx` — Tabs (Content: title+auto-slug mirroring Go slugify+Tiptap; SEO: meta/canonical/OG; Publish: status Switch + Calendar `publishedAt`). Server Action submit re-parses zod schema (server trust boundary), `revalidatePath`.
- [ ] `features/media/*` — `CoverImageField` → Server Action → `POST /admin/media`, preview via `next/image` w/ dims.
- [ ] `(admin)/admin/taxonomy/page.tsx` (Tabs Categories|Tags, Dialog CRUD, Command multi-select for tag assignment), `(admin)/admin/settings/page.tsx`.
- [ ] `(admin)/admin/error.tsx` + `loading.tsx` per segment; Sonner toasts (user-friendly only, no internal detail); 409→inline slug error.
- [ ] Tests: Vitest for zod schemas + actions; Playwright E2E: login → create draft → schedule → publish → verify on public site; unauthorized `/admin` → redirect.

### M6 — Hardening & optional extras
- [ ] Backend `/rss.xml` `/atom.xml` `/sitemap.xml` `/robots.txt` (`gorilla/feeds`) — only if a non-web consumer needs them.
- [ ] Scheduled-publish accuracy: lightweight ticker flipping `scheduled→published` at `published_at` + firing revalidate (query-gate already covers reads; ticker keeps feeds/sitemap exact).
- [ ] `STORAGE_DRIVER=s3` implementation behind the media-service interface.
- [ ] `security-reviewer` pass on auth + media upload; `code-reviewer` pass on the full diff.

---

## 5. Production Readiness Checklist

**Security**
- [ ] No hardcoded secrets; `JWT_SECRET`, `ADMIN_PASSWORD`, `REVALIDATE_SECRET` env-only; `ADMIN_PASSWORD` rotated after first login.
- [ ] argon2id passwords; JWT HS256 with `tv` revoke; access 15m / refresh 7d.
- [ ] Tokens in httpOnly+Secure+SameSite cookies (Next origin); JWT never in localStorage/JS.
- [ ] CORS strict allowlist, `AllowCredentials:true`, never `*`; CSRF covered by same-origin Server Actions + SameSite.
- [ ] All input validated at boundary (go-playground + zod, re-validated server-side in Server Actions).
- [ ] Parameterized queries only; `websearch_to_tsquery` for FTS (no query injection).
- [ ] Content sanitized twice: bluemonday (Go write) + DOMPurify (FE render); never raw `dangerouslySetInnerHTML`.
- [ ] Rate limiting: global per-IP + strict `/auth/login`. Media MIME allowlist + size cap.
- [ ] Security headers (HSTS, X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy) + production CSP.
- [ ] Generic 500 messages; real errors logged with request id; no token/PII in logs.

**SEO**
- [ ] `metadataBase` + per-post `generateMetadata` (canonical, OG article, twitter).
- [ ] JSON-LD BlogPosting + BreadcrumbList + WebSite/SearchAction/Organization.
- [ ] `sitemap.xml` (posts/categories/tags, `lastModified`), `robots.txt` (disallow `/api/`,`/search`), `feed.xml`+`atom.xml`.
- [ ] Filter/pagination pages canonicalize to base list; `/search` excluded.
- [ ] Per-post + fallback OG images via next/og.

**Performance**
- [ ] Budgets: LCP<2.5s, INP<200ms, CLS<0.1; landing JS<150kb gz, CSS<30kb.
- [ ] Cache Components: static shells + `'use cache'`/`cacheTag`, on-demand `revalidateTag` via webhook.
- [ ] All images explicit `width/height` (or `fill`+aspect wrapper) + `placeholder="blur"` from backend LQIP; hero eager/high, rest lazy; AVIF/WebP.
- [ ] Client islands limited to nav/search/filter/editor; admin editor+shadcn code-split out of public bundle.
- [ ] Motion on compositor props only; DB pool tuned; `(status,published_at)` + GIN indexes.

**Testing (≥80%)**
- [ ] Backend: `go test -race -cover ./...`, testcontainers integration, gosec/staticcheck in CI.
- [ ] Public: Playwright visual (4 breakpoints, both themes) + a11y + Lighthouse.
- [ ] Admin: Vitest schemas/actions + Playwright login→publish→public E2E.

**Deployment / Env**
- [ ] Backend deploy step: `cmd/migrate up` then `cmd/seed` (idempotent) then server; graceful shutdown wired.
- [ ] `AutoMigrate` disabled in production (`APP_ENV=production`).
- [ ] `.env.example` for both apps complete; `BACKEND_URL`/`API_BASE_URL` server-only (never `NEXT_PUBLIC_`); `REVALIDATE_URL`/`REVALIDATE_SECRET` shared both sides.
- [ ] Media persistence strategy chosen (local volume vs S3/GCS) before launch.
- [ ] CI green (lint, typecheck, tests, build) required before merge.

---

## 6. Open Decisions & Risks

1. **Media storage at launch** — local disk is simplest but needs a persistent volume and complicates horizontal scaling; S3/GCS is the safe production choice. **Decision:** build behind the `media-service` interface with local as default; flip to S3 in M6 if hosting is ephemeral. *Risk: platform without persistent disk breaks local driver — confirm host before launch.*
2. **Scheduled publish accuracy** — query-time gate makes scheduled posts appear on read without a cron, but `sitemap.xml`/`feed.xml` are cache-tag-invalidated and won't refresh at the scheduled instant. **Decision:** M6 ticker flips status + fires revalidate. *Risk: until M6, a just-scheduled post can lag in feeds until the next cache cycle — acceptable for a personal blog.*
3. **Content storage format** — HTML (sanitized) chosen for render simplicity; loses structured re-theming vs Tiptap JSON. *Risk: future migration to JSON needs a backfill. Low for single author.*
4. **Two SEO/feed generators** (Next + optional backend) — Next is canonical; backend feeds are secondary and deferred. *Risk: drift if both ship — mitigate by treating backend feeds as API-consumer-only and not linking them from the public site.*
5. **Next 16 Cache Components maturity** — `'use cache'`/PPR is newer surface; the `AGENTS.md` warns of breaking changes vs training data. **Mitigation:** consult `node_modules/next/dist/docs/` before writing cache/`params`/`proxy.ts` code; the "Uncached data outside `<Suspense>`" build error is the main foot-gun (only `/search` touches runtime APIs).
6. **Single-admin refresh-token revocation** — `token_version` gives global logout without a token table; no per-device revocation. Acceptable for single admin (YAGNI); revisit only if multi-user is ever added.
7. **Admin bundle isolation** — same-app route group relies on Next code-splitting to keep Tiptap/shadcn out of the public bundle. **Mitigation:** verify with a bundle analyzer in M5; if public LCP regresses, that is the trigger (not premature) to split into a separate app.