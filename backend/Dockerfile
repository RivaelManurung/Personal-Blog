# syntax=docker/dockerfile:1

# ---- Builder ----------------------------------------------------------------
FROM golang:1.26-alpine AS builder

WORKDIR /src

# Cache module downloads separately from the source build.
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .

# Static, CGO-free binaries so they run on a minimal alpine base.
ENV CGO_ENABLED=0 GOOS=linux
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -trimpath -ldflags="-s -w" -o /out/server  ./cmd/server && \
    go build -trimpath -ldflags="-s -w" -o /out/migrate ./cmd/migrate && \
    go build -trimpath -ldflags="-s -w" -o /out/seed    ./cmd/seed

# ---- Runtime ----------------------------------------------------------------
# alpine keeps a shell (needed for the migrate+seed+server chain in compose)
# while staying small. CA certs + tzdata for TLS and time handling.
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata wget && \
    addgroup -S app && adduser -S -G app -H -h /app app

WORKDIR /app

# migrate reads "file://migrations" relative to the working directory, and
# STORAGE_PATH defaults to storage/uploads (also relative to WORKDIR).
COPY --from=builder /out/server  /app/server
COPY --from=builder /out/migrate /app/migrate
COPY --from=builder /out/seed    /app/seed
COPY --from=builder /src/migrations /app/migrations

# Writable uploads directory owned by the non-root runtime user.
RUN mkdir -p /app/storage/uploads && chown -R app:app /app

USER app

EXPOSE 8080

# Default command runs the API server. Compose overrides this to chain
# migrate + seed + server on first boot.
CMD ["/app/server"]
