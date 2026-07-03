package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/rivael/blog-backend/internal/models"
	"gorm.io/gorm"
)

const publishGateSQL = "status = 'published' AND published_at IS NOT NULL AND published_at <= now()"

type postRepository struct {
	db *gorm.DB
}

// NewPostRepository constructs a GORM-backed PostRepository.
func NewPostRepository(db *gorm.DB) PostRepository {
	return &postRepository{db: db}
}

func (r *postRepository) Create(ctx context.Context, p *models.Post) error {
	if err := r.db.WithContext(ctx).Create(p).Error; err != nil {
		return fmt.Errorf("create post: %w", err)
	}
	return nil
}

func (r *postRepository) Update(ctx context.Context, p *models.Post) error {
	if err := r.db.WithContext(ctx).Save(p).Error; err != nil {
		return fmt.Errorf("update post: %w", err)
	}
	return nil
}

// replaceTagsTx replaces p's tag associations within tx. An empty tagIDs
// clears all associations.
func replaceTagsTx(tx *gorm.DB, p *models.Post, tagIDs []int64) error {
	tags := make([]models.Tag, 0, len(tagIDs))
	for _, id := range tagIDs {
		tags = append(tags, models.Tag{ID: id})
	}
	if err := tx.Model(p).Association("Tags").Replace(tags); err != nil {
		return fmt.Errorf("set post tags: %w", err)
	}
	return nil
}

func (r *postRepository) CreateWithTags(ctx context.Context, p *models.Post, tagIDs []int64) error {
	if err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(p).Error; err != nil {
			return fmt.Errorf("create post: %w", err)
		}
		return replaceTagsTx(tx, p, tagIDs)
	}); err != nil {
		return err
	}
	return nil
}

func (r *postRepository) UpdateWithTags(ctx context.Context, p *models.Post, tagIDs []int64) error {
	if err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(p).Error; err != nil {
			return fmt.Errorf("update post: %w", err)
		}
		return replaceTagsTx(tx, p, tagIDs)
	}); err != nil {
		return err
	}
	return nil
}

func (r *postRepository) Delete(ctx context.Context, id int64) (bool, error) {
	res := r.db.WithContext(ctx).Delete(&models.Post{}, id)
	if res.Error != nil {
		return false, fmt.Errorf("delete post: %w", res.Error)
	}
	return res.RowsAffected > 0, nil
}

func (r *postRepository) preload(db *gorm.DB) *gorm.DB {
	return db.Preload("Category").Preload("Tags").Preload("CoverImage").Preload("OGImage").Preload("Author")
}

func (r *postRepository) FindByID(ctx context.Context, id int64) (*models.Post, error) {
	var p models.Post
	q := r.preload(r.db.WithContext(ctx))
	if err := q.First(&p, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFoundType{Entity: "post"}
		}
		return nil, fmt.Errorf("find post by id: %w", err)
	}
	return &p, nil
}

func (r *postRepository) FindBySlug(ctx context.Context, slug string, publishedOnly bool) (*models.Post, error) {
	var p models.Post
	q := r.preload(r.db.WithContext(ctx)).Where("slug = ?", slug)
	if publishedOnly {
		q = q.Where(publishGateSQL)
	}
	if err := q.First(&p).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFoundType{Entity: "post"}
		}
		return nil, fmt.Errorf("find post by slug: %w", err)
	}
	return &p, nil
}

var allowedPostSorts = map[string]string{
	"published_at desc": "published_at desc",
	"published_at asc":  "published_at asc",
	"created_at desc":   "created_at desc",
	"created_at asc":    "created_at asc",
	"title asc":         "title asc",
}

func (r *postRepository) List(ctx context.Context, f PostFilter) ([]models.Post, int64, error) {
	base := r.db.WithContext(ctx).Model(&models.Post{})

	if f.Status != nil {
		base = base.Where("posts.status = ?", *f.Status)
	}
	// The reserved About page is managed at /admin/about and served at /about; it
	// never appears in any post listing — public (articles, sitemap, feed) or
	// admin (the Posts table).
	base = base.Where("posts.slug <> ?", models.AboutSlug)
	if f.PublishedOnly {
		base = base.Where(publishGateSQL)
	}
	if f.CategorySlug != "" {
		base = base.Joins("JOIN categories ON categories.id = posts.category_id").
			Where("categories.slug = ?", f.CategorySlug)
	}
	if f.TagSlug != "" {
		base = base.Joins("JOIN post_tags ON post_tags.post_id = posts.id").
			Joins("JOIN tags ON tags.id = post_tags.tag_id").
			Where("tags.slug = ?", f.TagSlug)
	}
	if f.Query != "" {
		base = base.Where("posts.title ILIKE '%' || ? || '%'", f.Query)
	}

	var total int64
	if err := base.Session(&gorm.Session{}).Distinct("posts.id").Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count posts: %w", err)
	}

	page := f.Page
	if page < 1 {
		page = 1
	}
	limit := f.Limit
	if limit < 1 || limit > 50 {
		limit = 10
	}
	offset := (page - 1) * limit

	orderBy := "published_at desc NULLS LAST, created_at desc"
	if sort, ok := allowedPostSorts[f.Sort]; ok {
		orderBy = sort
	}

	var items []models.Post
	q := r.preload(base.Session(&gorm.Session{})).
		Distinct("posts.*").
		Order(orderBy).
		Limit(limit).
		Offset(offset)
	if err := q.Find(&items).Error; err != nil {
		return nil, 0, fmt.Errorf("list posts: %w", err)
	}

	return items, total, nil
}

func (r *postRepository) Search(ctx context.Context, query string, page, limit int) ([]SearchResult, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}
	offset := (page - 1) * limit

	type searchRow struct {
		ID      int64
		Title   string
		Slug    string
		Excerpt string
		Rank    float64
		Snippet string
	}

	var rows []searchRow
	sql := `
		SELECT
			posts.id AS id,
			posts.title AS title,
			posts.slug AS slug,
			posts.excerpt AS excerpt,
			ts_rank(posts.search_vector, websearch_to_tsquery('english', ?)) AS rank,
			ts_headline('english', posts.excerpt, websearch_to_tsquery('english', ?)) AS snippet
		FROM posts
		WHERE ` + publishGateSQL + `
			AND posts.slug <> ?
			AND posts.search_vector @@ websearch_to_tsquery('english', ?)
		ORDER BY rank DESC
		LIMIT ? OFFSET ?
	`
	if err := r.db.WithContext(ctx).Raw(sql, query, query, models.AboutSlug, query, limit, offset).Scan(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("search posts: %w", err)
	}

	var total int64
	countSQL := `
		SELECT COUNT(*) FROM posts
		WHERE ` + publishGateSQL + `
			AND posts.slug <> ?
			AND posts.search_vector @@ websearch_to_tsquery('english', ?)
	`
	if err := r.db.WithContext(ctx).Raw(countSQL, models.AboutSlug, query).Scan(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count search posts: %w", err)
	}

	hits := make([]SearchResult, 0, len(rows))
	for _, row := range rows {
		hits = append(hits, SearchResult{
			Post: models.Post{
				ID:      row.ID,
				Title:   row.Title,
				Slug:    row.Slug,
				Excerpt: row.Excerpt,
			},
			Snippet: row.Snippet,
			Rank:    row.Rank,
		})
	}

	return hits, total, nil
}

func (r *postRepository) SetTags(ctx context.Context, postID int64, tagIDs []int64) error {
	tags := make([]models.Tag, 0, len(tagIDs))
	for _, id := range tagIDs {
		tags = append(tags, models.Tag{ID: id})
	}
	post := models.Post{ID: postID}
	if err := r.db.WithContext(ctx).Model(&post).Association("Tags").Replace(tags); err != nil {
		return fmt.Errorf("set post tags: %w", err)
	}
	return nil
}

func (r *postRepository) Stats(ctx context.Context) (PostStats, error) {
	var stats PostStats

	if err := r.db.WithContext(ctx).Model(&models.Post{}).Count(&stats.Total).Error; err != nil {
		return PostStats{}, fmt.Errorf("count total posts: %w", err)
	}
	if err := r.db.WithContext(ctx).Model(&models.Post{}).
		Where(publishGateSQL).Count(&stats.Published).Error; err != nil {
		return PostStats{}, fmt.Errorf("count published posts: %w", err)
	}
	if err := r.db.WithContext(ctx).Model(&models.Post{}).
		Where("status = ?", models.StatusDraft).Count(&stats.Drafts).Error; err != nil {
		return PostStats{}, fmt.Errorf("count draft posts: %w", err)
	}
	if err := r.db.WithContext(ctx).Model(&models.Post{}).
		Where("status = ?", models.StatusScheduled).Count(&stats.Scheduled).Error; err != nil {
		return PostStats{}, fmt.Errorf("count scheduled posts: %w", err)
	}

	return stats, nil
}
