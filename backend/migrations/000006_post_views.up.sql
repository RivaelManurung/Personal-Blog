-- Add view_count column to posts table for fast sorting and total views display
ALTER TABLE posts ADD COLUMN IF NOT EXISTS view_count BIGINT NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_posts_view_count ON posts (view_count DESC);

-- Create daily views aggregation table for daily and monthly statistics
CREATE TABLE IF NOT EXISTS post_daily_views (
    post_id    BIGINT  NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    view_date  DATE    NOT NULL DEFAULT CURRENT_DATE,
    view_count INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (post_id, view_date)
);

CREATE INDEX IF NOT EXISTS idx_post_daily_views_date ON post_daily_views (view_date DESC);
