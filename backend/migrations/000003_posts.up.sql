-- Post lifecycle status
CREATE TYPE post_status AS ENUM ('draft', 'scheduled', 'published');

CREATE TABLE posts (
    id               BIGSERIAL PRIMARY KEY,
    title            TEXT        NOT NULL,
    slug             CITEXT      NOT NULL UNIQUE,
    excerpt          TEXT        NOT NULL DEFAULT '',
    content          TEXT        NOT NULL DEFAULT '',
    content_format   TEXT        NOT NULL DEFAULT 'html',
    cover_image_id   BIGINT      REFERENCES media(id)       ON DELETE SET NULL,
    og_image_id      BIGINT      REFERENCES media(id)       ON DELETE SET NULL,
    category_id      BIGINT      REFERENCES categories(id)  ON DELETE SET NULL,
    author_id        BIGINT      NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
    status           post_status NOT NULL DEFAULT 'draft',
    published_at     TIMESTAMPTZ,
    reading_time_min INTEGER     NOT NULL DEFAULT 1,
    seo_title        TEXT        NOT NULL DEFAULT '',
    seo_description  TEXT        NOT NULL DEFAULT '',
    canonical_url    TEXT        NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_status_published_at ON posts (status, published_at DESC);
CREATE INDEX idx_posts_category            ON posts (category_id);

-- Post <-> Tag join
CREATE TABLE post_tags (
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id  BIGINT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX idx_post_tags_tag ON post_tags (tag_id);
