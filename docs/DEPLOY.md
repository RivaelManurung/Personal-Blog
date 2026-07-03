# Deployment (Docker Compose)

The whole stack — Postgres, the Go/Fiber backend, and the Next.js frontend —
ships as containers orchestrated by `docker-compose.yml` at the repo root.

## Quick start

```bash
cp .env.docker.example .env      # then edit the values (see below)
docker compose up --build
```

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:8080>
- Postgres: `localhost:5432`

Ports are overridable via `FRONTEND_PORT`, `BACKEND_PORT`, `DB_PORT`.

## Boot flow

Compose starts the services in order using healthchecks and `depends_on`:

1. **db** (`postgres:18`) — data persists in the `pgdata` named volume.
   Becomes healthy once `pg_isready` passes.
2. **backend** — waits for `db` to be healthy, then runs:
   `migrate up` -> `seed` -> `server` (via `sh -c`). Both `migrate` and `seed`
   are idempotent, so restarts are safe. Uploaded media persists in the
   `uploads` named volume mounted at `/app/storage/uploads`.
3. **frontend** — Next.js standalone server (`node server.js`), talks to the
   backend over the internal network at `http://backend:8080`.

## Environment variables

See `.env.docker.example` for the full list. Key ones:

| Variable | Service | Notes |
|----------|---------|-------|
| `POSTGRES_USER/PASSWORD/DB` | db | Database credentials. |
| `JWT_SECRET` | backend | **Required in production.** Long random string. |
| `PUBLIC_BASE_URL` | backend | **Required in production.** Public frontend origin. |
| `CORS_ORIGINS` | backend | Explicit allowlist, no `*` in production. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | backend | Seeded admin. Rotate the password after first login. |
| `REVALIDATE_URL` | backend | Webhook to the frontend (`http://frontend:3000/...`). |
| `REVALIDATE_SECRET` | backend + frontend | Must match on both services. |
| `BACKEND_URL` | frontend | Server-only, internal name `http://backend:8080`. |
| `NEXT_PUBLIC_SITE_URL` | frontend | Public site origin. |
| `NEXT_PUBLIC_MEDIA_ORIGIN` | frontend | **Browser-reachable** public backend URL (e.g. `http://localhost:8080`), NOT the internal `backend:8080`. |

### `NEXT_PUBLIC_*` note

`NEXT_PUBLIC_*` values are read by Next.js at **build time** and inlined into
the client bundle. The defaults are baked during `docker compose build`. If you
change `NEXT_PUBLIC_SITE_URL` or `NEXT_PUBLIC_MEDIA_ORIGIN` for a different
environment, rebuild the frontend image (`docker compose build frontend`) with
those values present, rather than relying on runtime overrides.

## Images

- **backend** — multi-stage: `golang:1.26-alpine` builder producing static
  (`CGO_ENABLED=0`) `server`, `migrate`, and `seed` binaries, on a minimal
  `alpine:3.20` runtime as non-root user `app`. Ships the `migrations/` dir.
- **frontend** — multi-stage `node:22-alpine`: `npm ci` -> `npm run build`
  (`output: "standalone"`) -> runtime copies `.next/standalone`, `.next/static`,
  and `public/`, runs as the non-root `node` user.

## Operations

```bash
docker compose logs -f backend        # follow backend logs
docker compose exec backend /app/migrate version
docker compose down                   # stop (keeps volumes)
docker compose down -v                # stop and delete data + uploads
```
