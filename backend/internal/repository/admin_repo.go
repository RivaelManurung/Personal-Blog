package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/rivael/blog-backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type adminRepository struct {
	db *gorm.DB
}

// NewAdminRepository constructs a GORM-backed AdminRepository.
func NewAdminRepository(db *gorm.DB) AdminRepository {
	return &adminRepository{db: db}
}

func (r *adminRepository) FindByEmail(ctx context.Context, email string) (*models.AdminUser, error) {
	var a models.AdminUser
	if err := r.db.WithContext(ctx).Where("email = ?", email).First(&a).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFoundType{Entity: "admin"}
		}
		return nil, fmt.Errorf("find admin by email: %w", err)
	}
	return &a, nil
}

func (r *adminRepository) FindByID(ctx context.Context, id int64) (*models.AdminUser, error) {
	var a models.AdminUser
	if err := r.db.WithContext(ctx).First(&a, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFoundType{Entity: "admin"}
		}
		return nil, fmt.Errorf("find admin by id: %w", err)
	}
	return &a, nil
}

func (r *adminRepository) Upsert(ctx context.Context, a *models.AdminUser) error {
	err := r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "email"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"password_hash", "display_name", "updated_at",
		}),
	}).Create(a).Error
	if err != nil {
		return fmt.Errorf("upsert admin: %w", err)
	}
	return nil
}

func (r *adminRepository) UpdatePassword(ctx context.Context, id int64, passwordHash string) error {
	err := r.db.WithContext(ctx).Model(&models.AdminUser{}).Where("id = ?", id).
		Updates(map[string]any{
			"password_hash": passwordHash,
			"updated_at":    time.Now(),
		}).Error
	if err != nil {
		return fmt.Errorf("update admin password: %w", err)
	}
	return nil
}

func (r *adminRepository) BumpTokenVersion(ctx context.Context, id int64) error {
	err := r.db.WithContext(ctx).Model(&models.AdminUser{}).Where("id = ?", id).
		Updates(map[string]any{
			"token_version": gorm.Expr("token_version + 1"),
			"updated_at":    time.Now(),
		}).Error
	if err != nil {
		return fmt.Errorf("bump admin token version: %w", err)
	}
	return nil
}

func (r *adminRepository) TouchLogin(ctx context.Context, id int64) error {
	err := r.db.WithContext(ctx).Model(&models.AdminUser{}).Where("id = ?", id).
		Update("last_login_at", time.Now()).Error
	if err != nil {
		return fmt.Errorf("touch admin login: %w", err)
	}
	return nil
}
