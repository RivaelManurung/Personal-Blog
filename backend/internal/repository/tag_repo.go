package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/rivael/blog-backend/internal/models"
	"gorm.io/gorm"
)

type tagRepository struct {
	db *gorm.DB
}

// NewTagRepository constructs a GORM-backed TagRepository.
func NewTagRepository(db *gorm.DB) TagRepository {
	return &tagRepository{db: db}
}

func (r *tagRepository) Create(ctx context.Context, t *models.Tag) error {
	if err := r.db.WithContext(ctx).Create(t).Error; err != nil {
		return fmt.Errorf("create tag: %w", err)
	}
	return nil
}

func (r *tagRepository) Update(ctx context.Context, t *models.Tag) error {
	if err := r.db.WithContext(ctx).Save(t).Error; err != nil {
		return fmt.Errorf("update tag: %w", err)
	}
	return nil
}

func (r *tagRepository) Delete(ctx context.Context, id int64) (bool, error) {
	res := r.db.WithContext(ctx).Delete(&models.Tag{}, id)
	if res.Error != nil {
		return false, fmt.Errorf("delete tag: %w", res.Error)
	}
	return res.RowsAffected > 0, nil
}

func (r *tagRepository) FindByID(ctx context.Context, id int64) (*models.Tag, error) {
	var t models.Tag
	if err := r.db.WithContext(ctx).First(&t, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFoundType{Entity: "tag"}
		}
		return nil, fmt.Errorf("find tag by id: %w", err)
	}
	return &t, nil
}

func (r *tagRepository) FindBySlug(ctx context.Context, slug string) (*models.Tag, error) {
	var t models.Tag
	if err := r.db.WithContext(ctx).Where("slug = ?", slug).First(&t).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFoundType{Entity: "tag"}
		}
		return nil, fmt.Errorf("find tag by slug: %w", err)
	}
	return &t, nil
}

func (r *tagRepository) ListWithCounts(ctx context.Context) ([]models.Tag, map[int64]int64, error) {
	var tags []models.Tag
	if err := r.db.WithContext(ctx).Order("name asc").Find(&tags).Error; err != nil {
		return nil, nil, fmt.Errorf("list tags: %w", err)
	}

	type countRow struct {
		TagID int64
		Count int64
	}
	var rows []countRow
	err := r.db.WithContext(ctx).Table("post_tags").
		Select("post_tags.tag_id as tag_id, count(*) as count").
		Joins("JOIN posts ON posts.id = post_tags.post_id").
		Where(publishGateSQL).
		Group("post_tags.tag_id").
		Scan(&rows).Error
	if err != nil {
		return nil, nil, fmt.Errorf("count posts by tag: %w", err)
	}

	counts := make(map[int64]int64, len(rows))
	for _, row := range rows {
		counts[row.TagID] = row.Count
	}

	return tags, counts, nil
}

func (r *tagRepository) ExistingIDs(ctx context.Context, ids []int64) ([]int64, error) {
	if len(ids) == 0 {
		return []int64{}, nil
	}
	var existing []int64
	if err := r.db.WithContext(ctx).Model(&models.Tag{}).
		Where("id IN ?", ids).
		Pluck("id", &existing).Error; err != nil {
		return nil, fmt.Errorf("check existing tag ids: %w", err)
	}
	return existing, nil
}
