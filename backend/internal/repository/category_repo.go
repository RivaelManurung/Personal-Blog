package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/rivael/blog-backend/internal/models"
	"gorm.io/gorm"
)

type categoryRepository struct {
	db *gorm.DB
}

// NewCategoryRepository constructs a GORM-backed CategoryRepository.
func NewCategoryRepository(db *gorm.DB) CategoryRepository {
	return &categoryRepository{db: db}
}

func (r *categoryRepository) Create(ctx context.Context, c *models.Category) error {
	if err := r.db.WithContext(ctx).Create(c).Error; err != nil {
		return fmt.Errorf("create category: %w", err)
	}
	return nil
}

func (r *categoryRepository) Update(ctx context.Context, c *models.Category) error {
	if err := r.db.WithContext(ctx).Save(c).Error; err != nil {
		return fmt.Errorf("update category: %w", err)
	}
	return nil
}

func (r *categoryRepository) Delete(ctx context.Context, id int64) (bool, error) {
	res := r.db.WithContext(ctx).Delete(&models.Category{}, id)
	if res.Error != nil {
		return false, fmt.Errorf("delete category: %w", res.Error)
	}
	return res.RowsAffected > 0, nil
}

func (r *categoryRepository) FindByID(ctx context.Context, id int64) (*models.Category, error) {
	var c models.Category
	if err := r.db.WithContext(ctx).First(&c, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFoundType{Entity: "category"}
		}
		return nil, fmt.Errorf("find category by id: %w", err)
	}
	return &c, nil
}

func (r *categoryRepository) FindBySlug(ctx context.Context, slug string) (*models.Category, error) {
	var c models.Category
	if err := r.db.WithContext(ctx).Where("slug = ?", slug).First(&c).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFoundType{Entity: "category"}
		}
		return nil, fmt.Errorf("find category by slug: %w", err)
	}
	return &c, nil
}

func (r *categoryRepository) ListWithCounts(ctx context.Context) ([]models.Category, map[int64]int64, error) {
	var categories []models.Category
	if err := r.db.WithContext(ctx).Order("name asc").Find(&categories).Error; err != nil {
		return nil, nil, fmt.Errorf("list categories: %w", err)
	}

	type countRow struct {
		CategoryID int64
		Count      int64
	}
	var rows []countRow
	err := r.db.WithContext(ctx).Model(&models.Post{}).
		Select("category_id, count(*) as count").
		Where(publishGateSQL).
		Where("category_id IS NOT NULL").
		Group("category_id").
		Scan(&rows).Error
	if err != nil {
		return nil, nil, fmt.Errorf("count posts by category: %w", err)
	}

	counts := make(map[int64]int64, len(rows))
	for _, row := range rows {
		counts[row.CategoryID] = row.Count
	}

	return categories, counts, nil
}
