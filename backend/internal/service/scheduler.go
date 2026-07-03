package service

import (
	"context"
	"log/slog"
	"time"

	"github.com/rivael/blog-backend/internal/models"
	"gorm.io/gorm"
)

// Scheduler periodically promotes due "scheduled" posts to "published".
//
// The public read gate already hides scheduled posts until their time, but
// feeds/sitemap are cache-tagged — this ticker flips the status at the due
// moment and fires the revalidation webhook so those surfaces stay exact.
type Scheduler struct {
	db       *gorm.DB
	reval    *Revalidator
	interval time.Duration
}

func NewScheduler(db *gorm.DB, reval *Revalidator, interval time.Duration) *Scheduler {
	if interval <= 0 {
		interval = time.Minute
	}
	return &Scheduler{db: db, reval: reval, interval: interval}
}

// Run blocks until ctx is cancelled, flushing due posts on each tick.
func (s *Scheduler) Run(ctx context.Context) {
	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	s.flush(ctx) // run once at startup
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.flush(ctx)
		}
	}
}

func (s *Scheduler) flush(ctx context.Context) {
	var due []models.Post
	err := s.db.WithContext(ctx).
		Preload("Category").
		Preload("Tags").
		Where("status = ? AND published_at IS NOT NULL AND published_at <= now()", models.StatusScheduled).
		Find(&due).Error
	if err != nil {
		slog.Error("scheduler: query due posts failed", "error", err)
		return
	}
	if len(due) == 0 {
		return
	}

	ids := make([]int64, len(due))
	for i := range due {
		ids[i] = due[i].ID
	}
	if err := s.db.WithContext(ctx).
		Model(&models.Post{}).
		Where("id IN ? AND status = ? AND published_at <= now()", ids, models.StatusScheduled).
		Update("status", models.StatusPublished).Error; err != nil {
		slog.Error("scheduler: promote failed", "error", err)
		return
	}

	for i := range due {
		p := due[i]
		categorySlug := ""
		if p.Category != nil {
			categorySlug = p.Category.Slug
		}
		tagSlugs := make([]string, 0, len(p.Tags))
		for _, t := range p.Tags {
			tagSlugs = append(tagSlugs, t.Slug)
		}
		s.reval.Trigger(PostTags(p.Slug, categorySlug, tagSlugs))
	}
	slog.Info("scheduler: promoted scheduled posts", "count", len(due))
}
