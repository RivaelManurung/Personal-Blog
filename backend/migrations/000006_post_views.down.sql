DROP TABLE IF EXISTS post_daily_views;
DROP INDEX IF EXISTS idx_posts_view_count;
ALTER TABLE posts DROP COLUMN IF EXISTS view_count;
