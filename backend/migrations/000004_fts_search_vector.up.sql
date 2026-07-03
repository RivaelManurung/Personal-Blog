-- Full-text search vector: title (A) + excerpt (B) + content (C).
-- Generated column keeps it always in sync; weights bias ranking toward titles.
ALTER TABLE posts
    ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')),   'A') ||
        setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(content, '')), 'C')
    ) STORED;

CREATE INDEX idx_posts_search_vector ON posts USING GIN (search_vector);
