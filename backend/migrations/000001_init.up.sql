-- Extensions
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Admin users (single-admin personal blog; table shape allows future multi-user)
CREATE TABLE admin_users (
    id            BIGSERIAL PRIMARY KEY,
    email         CITEXT      NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    display_name  TEXT        NOT NULL DEFAULT '',
    token_version INTEGER     NOT NULL DEFAULT 0,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categories (a post belongs to at most one category)
CREATE TABLE categories (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT        NOT NULL,
    slug        CITEXT      NOT NULL UNIQUE,
    description TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tags (many-to-many with posts via post_tags)
CREATE TABLE tags (
    id         BIGSERIAL PRIMARY KEY,
    name       TEXT        NOT NULL,
    slug       CITEXT      NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
