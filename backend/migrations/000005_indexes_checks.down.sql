ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_published_at_check;

DROP INDEX IF EXISTS idx_posts_author;
DROP INDEX IF EXISTS idx_posts_og_image;
DROP INDEX IF EXISTS idx_posts_cover_image;
