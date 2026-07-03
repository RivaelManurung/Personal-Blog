// Package repository defines data-access interfaces and their filter/result
// types. Concrete GORM implementations live in the *_repo.go files and are
// constructed via the New*Repository functions documented on each interface.
package repository

import (
	"context"

	"github.com/rivael/blog-backend/internal/models"
)

// ErrNotFound is returned when a lookup matches no row. Implementations must
// translate gorm.ErrRecordNotFound into this sentinel.
type ErrNotFoundType struct{ Entity string }

func (e ErrNotFoundType) Error() string { return e.Entity + " not found" }

// PostFilter parameterizes List. Zero values mean "no constraint".
type PostFilter struct {
	Status        *models.PostStatus // admin: filter by exact status
	CategorySlug  string
	TagSlug       string
	Query         string // admin list free-text (ILIKE title)
	PublishedOnly bool   // public reads: apply the publish gate
	Page          int
	Limit         int
	Sort          string // e.g. "published_at desc" (whitelisted by impl)
}

// SearchResult is one full-text search hit with snippet + ts_rank.
type SearchResult struct {
	Post    models.Post
	Snippet string
	Rank    float64
}

// PostStats powers the admin dashboard.
type PostStats struct {
	Total     int64
	Published int64
	Drafts    int64
	Scheduled int64
}

// PostRepository — construct with NewPostRepository(db *gorm.DB) PostRepository.
type PostRepository interface {
	Create(ctx context.Context, p *models.Post) error
	Update(ctx context.Context, p *models.Post) error
	// CreateWithTags creates the post and replaces its tag associations in a
	// single transaction; a failure rolls back both.
	CreateWithTags(ctx context.Context, p *models.Post, tagIDs []int64) error
	// UpdateWithTags saves the post and replaces its tag associations in a
	// single transaction; a failure rolls back both.
	UpdateWithTags(ctx context.Context, p *models.Post, tagIDs []int64) error
	Delete(ctx context.Context, id int64) (bool, error)
	FindByID(ctx context.Context, id int64) (*models.Post, error)
	// FindBySlug preloads relations; when publishedOnly it applies the publish gate.
	FindBySlug(ctx context.Context, slug string, publishedOnly bool) (*models.Post, error)
	List(ctx context.Context, f PostFilter) (items []models.Post, total int64, err error)
	Search(ctx context.Context, query string, page, limit int) (hits []SearchResult, total int64, err error)
	// SetTags replaces the post's tag associations.
	SetTags(ctx context.Context, postID int64, tagIDs []int64) error
	Stats(ctx context.Context) (PostStats, error)
}

// CategoryRepository — construct with NewCategoryRepository(db *gorm.DB).
type CategoryRepository interface {
	Create(ctx context.Context, c *models.Category) error
	Update(ctx context.Context, c *models.Category) error
	Delete(ctx context.Context, id int64) (bool, error)
	FindByID(ctx context.Context, id int64) (*models.Category, error)
	FindBySlug(ctx context.Context, slug string) (*models.Category, error)
	// ListWithCounts returns categories with their published post counts.
	ListWithCounts(ctx context.Context) ([]models.Category, map[int64]int64, error)
}

// TagRepository — construct with NewTagRepository(db *gorm.DB).
type TagRepository interface {
	Create(ctx context.Context, t *models.Tag) error
	Update(ctx context.Context, t *models.Tag) error
	Delete(ctx context.Context, id int64) (bool, error)
	FindByID(ctx context.Context, id int64) (*models.Tag, error)
	FindBySlug(ctx context.Context, slug string) (*models.Tag, error)
	ListWithCounts(ctx context.Context) ([]models.Tag, map[int64]int64, error)
	// EnsureIDs validates that every id exists, returning the valid subset.
	ExistingIDs(ctx context.Context, ids []int64) ([]int64, error)
}

// MediaRepository — construct with NewMediaRepository(db *gorm.DB).
type MediaRepository interface {
	Create(ctx context.Context, m *models.Media) error
	Delete(ctx context.Context, id int64) (bool, error)
	FindByID(ctx context.Context, id int64) (*models.Media, error)
	// List returns media newest-first with offset/limit pagination and the
	// total row count. page is clamped to >=1; limit to 1..50 (default 10).
	List(ctx context.Context, page, limit int) (items []models.Media, total int64, err error)
}

// AdminRepository — construct with NewAdminRepository(db *gorm.DB).
type AdminRepository interface {
	FindByEmail(ctx context.Context, email string) (*models.AdminUser, error)
	FindByID(ctx context.Context, id int64) (*models.AdminUser, error)
	Upsert(ctx context.Context, a *models.AdminUser) error
	UpdatePassword(ctx context.Context, id int64, passwordHash string) error
	BumpTokenVersion(ctx context.Context, id int64) error
	TouchLogin(ctx context.Context, id int64) error
}

// IsNotFound reports whether err is a not-found sentinel from this package.
func IsNotFound(err error) bool {
	_, ok := err.(ErrNotFoundType)
	return ok
}
