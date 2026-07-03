-- Foreign-key supporting indexes for post media/author lookups and joins.
CREATE INDEX idx_posts_cover_image ON posts (cover_image_id);
CREATE INDEX idx_posts_og_image    ON posts (og_image_id);
CREATE INDEX idx_posts_author      ON posts (author_id);

-- A published post must have a published_at timestamp.
ALTER TABLE posts
    ADD CONSTRAINT posts_published_at_check
    CHECK (status <> 'published' OR published_at IS NOT NULL);
