//go:build integration

package repository

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/rivael/blog-backend/internal/models"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// testDB opens a connection to TEST_DATABASE_URL, skipping the test if unset.
func testDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("set TEST_DATABASE_URL to run integration tests")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err, "open test database")

	truncateAll(t, db)

	return db
}

// truncateAll resets the tables touched by these tests so each test starts
// from a clean, isolated slate.
func truncateAll(t *testing.T, db *gorm.DB) {
	t.Helper()

	err := db.Exec(`TRUNCATE TABLE post_tags, posts, categories, tags, media, admin_users RESTART IDENTITY CASCADE`).Error
	require.NoError(t, err, "truncate tables")
}

// seedAdmin creates a minimal admin_user row and returns its ID. posts.author_id
// is NOT NULL + FK-constrained, so every post fixture needs one of these.
func seedAdmin(t *testing.T, db *gorm.DB) int64 {
	t.Helper()

	admin := &models.AdminUser{
		Email:        "admin@example.com",
		PasswordHash: "$argon2id$v=19$m=65536,t=3,p=2$c2FsdA$aGFzaA",
		DisplayName:  "Test Admin",
	}
	require.NoError(t, db.Create(admin).Error, "seed admin user")
	return admin.ID
}

func makePost(authorID int64, opts ...func(*models.Post)) *models.Post {
	p := &models.Post{
		Title:         "Untitled Post",
		Slug:          "untitled-post",
		Excerpt:       "",
		Content:       "",
		ContentFormat: "html",
		AuthorID:      authorID,
		Status:        models.StatusDraft,
	}
	for _, opt := range opts {
		opt(p)
	}
	return p
}

func withSlug(slug string) func(*models.Post) {
	return func(p *models.Post) { p.Slug = slug }
}

func withTitle(title string) func(*models.Post) {
	return func(p *models.Post) { p.Title = title }
}

func withStatus(status models.PostStatus) func(*models.Post) {
	return func(p *models.Post) { p.Status = status }
}

func withPublishedAt(t time.Time) func(*models.Post) {
	return func(p *models.Post) { p.PublishedAt = &t }
}

func withContent(content string) func(*models.Post) {
	return func(p *models.Post) { p.Content = content }
}

func withExcerpt(excerpt string) func(*models.Post) {
	return func(p *models.Post) { p.Excerpt = excerpt }
}

func TestPostRepository_List_PublishedOnly(t *testing.T) {
	// Arrange
	db := testDB(t)
	ctx := context.Background()
	repo := NewPostRepository(db)
	authorID := seedAdmin(t, db)

	published := makePost(authorID,
		withSlug("published-post"),
		withTitle("Published Post"),
		withStatus(models.StatusPublished),
		withPublishedAt(time.Now().Add(-time.Hour)),
	)
	require.NoError(t, repo.Create(ctx, published))

	draft := makePost(authorID,
		withSlug("draft-post"),
		withTitle("Draft Post"),
		withStatus(models.StatusDraft),
	)
	require.NoError(t, repo.Create(ctx, draft))

	// Act
	items, total, err := repo.List(ctx, PostFilter{PublishedOnly: true, Page: 1, Limit: 10})

	// Assert
	require.NoError(t, err)
	require.EqualValues(t, 1, total)
	require.Len(t, items, 1)
	require.Equal(t, "published-post", items[0].Slug)
}

func TestPostRepository_FindBySlug_PublishGate(t *testing.T) {
	// Arrange
	db := testDB(t)
	ctx := context.Background()
	repo := NewPostRepository(db)
	authorID := seedAdmin(t, db)

	draft := makePost(authorID, withSlug("hidden-draft"), withStatus(models.StatusDraft))
	require.NoError(t, repo.Create(ctx, draft))

	// Act
	_, errPublishedOnly := repo.FindBySlug(ctx, "hidden-draft", true)
	found, errAny := repo.FindBySlug(ctx, "hidden-draft", false)

	// Assert
	require.Error(t, errPublishedOnly)
	var notFound ErrNotFoundType
	require.True(t, errors.As(errPublishedOnly, &notFound), "expected ErrNotFoundType, got %v", errPublishedOnly)

	require.NoError(t, errAny)
	require.Equal(t, "hidden-draft", found.Slug)
}

func TestPostRepository_Search(t *testing.T) {
	// Arrange
	db := testDB(t)
	ctx := context.Background()
	repo := NewPostRepository(db)
	authorID := seedAdmin(t, db)

	post := makePost(authorID,
		withSlug("searchable-post"),
		withTitle("A Post About Xenophontidae"),
		withStatus(models.StatusPublished),
		withPublishedAt(time.Now().Add(-time.Hour)),
		withContent("This post discusses xenophontidae at great length."),
		withExcerpt("An excerpt about xenophontidae."),
	)
	require.NoError(t, repo.Create(ctx, post))

	// Act
	hits, total, err := repo.Search(ctx, "xenophontidae", 1, 10)
	misses, missTotal, errMiss := repo.Search(ctx, "nonexistentwordzzz", 1, 10)

	// Assert
	require.NoError(t, err)
	require.EqualValues(t, 1, total)
	require.Len(t, hits, 1)
	require.Greater(t, hits[0].Rank, float64(0))
	require.Equal(t, "searchable-post", hits[0].Post.Slug)

	require.NoError(t, errMiss)
	require.EqualValues(t, 0, missTotal)
	require.Len(t, misses, 0)
}

func TestPostRepository_SetTags_ReplacesAssociations(t *testing.T) {
	// Arrange
	db := testDB(t)
	ctx := context.Background()
	repo := NewPostRepository(db)
	authorID := seedAdmin(t, db)

	post := makePost(authorID, withSlug("tagged-post"))
	require.NoError(t, repo.Create(ctx, post))

	tagA := &models.Tag{Name: "Alpha", Slug: "alpha"}
	tagB := &models.Tag{Name: "Beta", Slug: "beta"}
	tagC := &models.Tag{Name: "Gamma", Slug: "gamma"}
	require.NoError(t, db.Create(tagA).Error)
	require.NoError(t, db.Create(tagB).Error)
	require.NoError(t, db.Create(tagC).Error)

	// Act: assign A + B, then replace with just C.
	require.NoError(t, repo.SetTags(ctx, post.ID, []int64{tagA.ID, tagB.ID}))
	afterFirst, err := repo.FindByID(ctx, post.ID)
	require.NoError(t, err)

	require.NoError(t, repo.SetTags(ctx, post.ID, []int64{tagC.ID}))
	afterReplace, err := repo.FindByID(ctx, post.ID)
	require.NoError(t, err)

	// Assert
	require.Len(t, afterFirst.Tags, 2)
	require.Len(t, afterReplace.Tags, 1)
	require.Equal(t, "gamma", afterReplace.Tags[0].Slug)
}

func TestPostRepository_Stats(t *testing.T) {
	// Arrange
	db := testDB(t)
	ctx := context.Background()
	repo := NewPostRepository(db)
	authorID := seedAdmin(t, db)

	require.NoError(t, repo.Create(ctx, makePost(authorID,
		withSlug("stats-published"),
		withStatus(models.StatusPublished),
		withPublishedAt(time.Now().Add(-time.Hour)),
	)))
	require.NoError(t, repo.Create(ctx, makePost(authorID,
		withSlug("stats-draft-1"),
		withStatus(models.StatusDraft),
	)))
	require.NoError(t, repo.Create(ctx, makePost(authorID,
		withSlug("stats-draft-2"),
		withStatus(models.StatusDraft),
	)))
	require.NoError(t, repo.Create(ctx, makePost(authorID,
		withSlug("stats-scheduled"),
		withStatus(models.StatusScheduled),
		withPublishedAt(time.Now().Add(time.Hour)),
	)))

	// Act
	stats, err := repo.Stats(ctx)

	// Assert
	require.NoError(t, err)
	require.EqualValues(t, 4, stats.Total)
	require.EqualValues(t, 1, stats.Published)
	require.EqualValues(t, 2, stats.Drafts)
	require.EqualValues(t, 1, stats.Scheduled)
}

func TestPostRepository_SlugUniqueness_SurfacesUniqueViolation(t *testing.T) {
	// Arrange
	db := testDB(t)
	ctx := context.Background()
	repo := NewPostRepository(db)
	authorID := seedAdmin(t, db)

	first := makePost(authorID, withSlug("duplicate-slug"))
	require.NoError(t, repo.Create(ctx, first))

	second := makePost(authorID, withSlug("duplicate-slug"))

	// Act
	err := repo.Create(ctx, second)

	// Assert
	require.Error(t, err)
	var pgErr *pgconn.PgError
	require.True(t, errors.As(err, &pgErr), "expected a *pgconn.PgError in the error chain, got %v", err)
	require.Equal(t, "23505", pgErr.Code, "expected SQLSTATE 23505 unique_violation")
}
