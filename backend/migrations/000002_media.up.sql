-- Media assets (cover / OG images). LQIP stored inline for next/image blur placeholder.
CREATE TABLE media (
    id            BIGSERIAL PRIMARY KEY,
    filename      TEXT        NOT NULL,          -- stored (hashed) filename
    original_name TEXT        NOT NULL DEFAULT '',
    mime_type     TEXT        NOT NULL,
    size_bytes    BIGINT      NOT NULL,
    width         INTEGER     NOT NULL DEFAULT 0,
    height        INTEGER     NOT NULL DEFAULT 0,
    blur_data_url TEXT        NOT NULL DEFAULT '', -- base64 LQIP
    alt_text      TEXT        NOT NULL DEFAULT '',
    url           TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
