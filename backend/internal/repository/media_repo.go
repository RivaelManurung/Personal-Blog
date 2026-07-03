package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/rivael/blog-backend/internal/models"
	"gorm.io/gorm"
)

type mediaRepository struct {
	db *gorm.DB
}

// NewMediaRepository constructs a GORM-backed MediaRepository.
func NewMediaRepository(db *gorm.DB) MediaRepository {
	return &mediaRepository{db: db}
}

func (r *mediaRepository) Create(ctx context.Context, m *models.Media) error {
	if err := r.db.WithContext(ctx).Create(m).Error; err != nil {
		return fmt.Errorf("create media: %w", err)
	}
	return nil
}

func (r *mediaRepository) Delete(ctx context.Context, id int64) (bool, error) {
	res := r.db.WithContext(ctx).Delete(&models.Media{}, id)
	if res.Error != nil {
		return false, fmt.Errorf("delete media: %w", res.Error)
	}
	return res.RowsAffected > 0, nil
}

func (r *mediaRepository) List(ctx context.Context, page, limit int) ([]models.Media, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}
	offset := (page - 1) * limit

	base := r.db.WithContext(ctx).Model(&models.Media{})

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count media: %w", err)
	}

	var items []models.Media
	if err := base.Order("created_at desc").Offset(offset).Limit(limit).Find(&items).Error; err != nil {
		return nil, 0, fmt.Errorf("list media: %w", err)
	}
	return items, total, nil
}

func (r *mediaRepository) FindByID(ctx context.Context, id int64) (*models.Media, error) {
	var m models.Media
	if err := r.db.WithContext(ctx).First(&m, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFoundType{Entity: "media"}
		}
		return nil, fmt.Errorf("find media by id: %w", err)
	}
	return &m, nil
}
