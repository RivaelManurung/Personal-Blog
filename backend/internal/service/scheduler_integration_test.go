//go:build integration

package service

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/rivael/blog-backend/internal/config"
	"github.com/rivael/blog-backend/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// schedulerTestDB opens a connection to TEST_DATABASE_URL, skipping the test
// if unset, and truncates the tables this test touches.
func schedulerTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("set TEST_DATABASE_URL to run integration tests")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err, "open test database")

	require.NoError(t, db.Exec(`TRUNCATE TABLE post_tags, posts, categories, tags, media, admin_users RESTART IDENTITY CASCADE`).Error)

	return db
}

func schedulerSeedAdmin(t *testing.T, db *gorm.DB) int64 {
	t.Helper()
	admin := &models.AdminUser{
		Email:        "scheduler-admin@example.com",
		PasswordHash: "$argon2id$v=19$m=65536,t=3,p=2$c2FsdA$aGFzaA",
		DisplayName:  "Scheduler Admin",
	}
	require.NoError(t, db.Create(admin).Error)
	return admin.ID
}

// TestScheduler_PromotesPastDueScheduledPosts verifies that a "scheduled"
// post whose published_at is in the past gets promoted to "published" on a
// scheduler tick, while a future-dated scheduled post is left untouched.
func TestScheduler_PromotesPastDueScheduledPosts(t *testing.T) {
	// Arrange
	db := schedulerTestDB(t)
	authorID := schedulerSeedAdmin(t, db)

	past := time.Now().Add(-time.Hour)
	future := time.Now().Add(time.Hour)

	duePost := &models.Post{
		Title:         "Due Post",
		Slug:          "due-post",
		Content:       "content",
		ContentFormat: "html",
		AuthorID:      authorID,
		Status:        models.StatusScheduled,
		PublishedAt:   &past,
	}
	require.NoError(t, db.Create(duePost).Error)

	futurePost := &models.Post{
		Title:         "Future Post",
		Slug:          "future-post",
		Content:       "content",
		ContentFormat: "html",
		AuthorID:      authorID,
		Status:        models.StatusScheduled,
		PublishedAt:   &future,
	}
	require.NoError(t, db.Create(futurePost).Error)

	reval := NewRevalidator(&config.Config{}) // empty RevalidateURL => no-op
	sched := NewScheduler(db, reval, time.Millisecond)

	// Act: run the scheduler briefly. Run() flushes once at startup before
	// the ticker even fires, so a very short-lived context is enough to
	// exercise one flush pass.
	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()
	sched.Run(ctx)

	// Assert
	var due models.Post
	require.NoError(t, db.First(&due, duePost.ID).Error)
	assert.Equal(t, models.StatusPublished, due.Status, "past-due scheduled post should be promoted")

	var future2 models.Post
	require.NoError(t, db.First(&future2, futurePost.ID).Error)
	assert.Equal(t, models.StatusScheduled, future2.Status, "future-dated scheduled post should not be promoted")
}
