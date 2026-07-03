# Blog Backend (Go · Fiber · PostgreSQL)

Production-grade API for the personal blog: posts (draft/scheduled/published),
categories & tags, full-text search, media uploads, and JWT admin auth.

## Layout

```
cmd/
  server/   # HTTP server (DI + graceful shutdown)
  migrate/  # golang-migrate runner
  seed/     # idempotent admin seeder
internal/
  config/ database/ models/ dto/ token/
  repository/ service/ middleware/ handlers/ routes/ validator/
migrations/ # 000001..000004 up/down SQL
```

## Prerequisites

- Go 1.26+
- PostgreSQL 14+ with the `citext` and `pgcrypto` extensions available

## One-time database setup

Run as a Postgres superuser (adjust role/password to taste):

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE blog WITH LOGIN PASSWORD 'blog';
CREATE DATABASE blog OWNER blog;
SQL
```

Then copy `.env.example` to `.env` and set `DATABASE_URL`, e.g.:

```
DATABASE_URL=postgres://blog:blog@localhost:5432/blog?sslmode=disable
```

## Run

```bash
cp .env.example .env          # edit secrets (JWT_SECRET, ADMIN_PASSWORD, ...)
go run ./cmd/migrate up       # apply schema
go run ./cmd/seed             # create/reset the admin user
go run ./cmd/server           # start API on :8080
```

Health check: `curl localhost:8080/health` → `{"status":"ok"}`.

## API surface (base `/api/v1`)

- Public: `GET /posts`, `GET /posts/:slug`, `GET /search?q=`,
  `GET /categories`, `GET /categories/:slug/posts`, `GET /tags`,
  `GET /tags/:slug/posts`, `GET /media/:id`
- Auth: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`,
  `GET /auth/me`, `PUT /auth/password`
- Admin (Bearer token): `GET/POST/PUT/PATCH/DELETE /admin/posts`,
  `/admin/categories`, `/admin/tags`, `/admin/media`, `GET /admin/stats`

Responses use the envelope `{ success, data, error?, meta? }`.

## Notes

- Schema is owned by `cmd/migrate`. `AutoMigrate` runs only when `APP_ENV=development`.
- Uploaded media is served from `/uploads` (local storage driver; swap to S3 behind the media-service interface).
- On publish/update/delete the server fires a cache-revalidation webhook to
  `REVALIDATE_URL` (the Next.js frontend) — a no-op if unset.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and pull request. The `backend` job spins up a `postgres:18` service container (user/pass/db all `blog`), then runs `go vet`, a `gofmt` cleanliness check, `go run ./cmd/migrate up` against the service DB, `go test -race -tags=integration -cover ./...` (with `DATABASE_URL`/`TEST_DATABASE_URL` pointing at `localhost:5432` and a dummy `JWT_SECRET`), `go build ./...`, and a non-blocking `govulncheck`. No real secrets are needed for CI since development defaults are used.
