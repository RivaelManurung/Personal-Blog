# syntax=docker/dockerfile:1
#
# Single multi-stage Dockerfile for the whole blog monorepo.
# The build context is the repo root, so both service source trees are
# available. Select a service with its target (see docker-compose.yml):
#
#   docker build --target backend  -t blog-backend  .
#   docker build --target frontend -t blog-frontend .

# ============================================================================
# Backend — Go API
# ============================================================================

# ---- Go builder -------------------------------------------------------------
FROM golang:1.26-alpine AS backend-builder
WORKDIR /src

# Cache module downloads separately from the source build.
COPY backend/go.mod backend/go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY backend/ .

# Static, CGO-free binaries so they run on a minimal alpine base.
ENV CGO_ENABLED=0 GOOS=linux
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -trimpath -ldflags="-s -w" -o /out/server  ./cmd/server && \
    go build -trimpath -ldflags="-s -w" -o /out/migrate ./cmd/migrate && \
    go build -trimpath -ldflags="-s -w" -o /out/seed    ./cmd/seed

# ---- Backend runtime (target: backend) --------------------------------------
# alpine keeps a shell (needed for the migrate+seed+server chain in compose)
# while staying small. CA certs + tzdata for TLS and time handling.
FROM alpine:3.20 AS backend
RUN apk add --no-cache ca-certificates tzdata wget && \
    addgroup -S app && adduser -S -G app -H -h /app app
WORKDIR /app

# migrate reads "file://migrations" relative to the working directory, and
# STORAGE_PATH defaults to storage/uploads (also relative to WORKDIR).
COPY --from=backend-builder /out/server  /app/server
COPY --from=backend-builder /out/migrate /app/migrate
COPY --from=backend-builder /out/seed    /app/seed
COPY --from=backend-builder /src/migrations /app/migrations

# Writable uploads directory owned by the non-root runtime user.
RUN mkdir -p /app/storage/uploads && chown -R app:app /app
USER app
EXPOSE 8080

# Default command runs the API server. Compose overrides this to chain
# migrate + seed + server on first boot.
CMD ["/app/server"]

# ============================================================================
# Frontend — Next.js
# ============================================================================

# ---- Node deps --------------------------------------------------------------
FROM node:22-alpine AS frontend-deps
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# ---- Node build -------------------------------------------------------------
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY --from=frontend-deps /app/node_modules ./node_modules
COPY frontend/ .
# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so they
# must be provided as build args (see docker-publish.yml). BACKEND_URL is read by
# next.config.ts to compile image remotePatterns and /uploads rewrites.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_MEDIA_ORIGIN
ARG BACKEND_URL
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_MEDIA_ORIGIN=$NEXT_PUBLIC_MEDIA_ORIGIN \
    BACKEND_URL=$BACKEND_URL
RUN npm run build

# ---- Frontend runtime (target: frontend) ------------------------------------
FROM node:22-alpine AS frontend
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# node:alpine already ships a non-root "node" user (uid/gid 1000).
# public/ and static assets are served by the standalone server.
COPY --from=frontend-builder --chown=node:node /app/public ./public
COPY --from=frontend-builder --chown=node:node /app/.next/standalone ./
COPY --from=frontend-builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000

CMD ["node", "server.js"]
