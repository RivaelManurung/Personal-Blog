package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/rivael/blog-backend/internal/models"
	"github.com/rivael/blog-backend/internal/repository"
)

// EnsureAdmin creates the single admin user if it does not already exist.
// It never overwrites an existing admin's password (safe to call on every boot).
func EnsureAdmin(ctx context.Context, admins repository.AdminRepository, email, password string) error {
	if email == "" || password == "" {
		return fmt.Errorf("admin email and password are required to seed")
	}

	if _, err := admins.FindByEmail(ctx, email); err == nil {
		return nil // already present
	} else if !repository.IsNotFound(err) {
		return err
	}

	hash, err := HashPassword(password)
	if err != nil {
		return err
	}
	admin := &models.AdminUser{
		Email:        email,
		PasswordHash: hash,
		DisplayName:  deriveDisplayName(email),
	}
	return admins.Upsert(ctx, admin)
}

// ResetAdminPassword upserts the admin and sets its password (used by cmd/seed).
func ResetAdminPassword(ctx context.Context, admins repository.AdminRepository, email, password string) error {
	if email == "" || password == "" {
		return fmt.Errorf("admin email and password are required")
	}
	hash, err := HashPassword(password)
	if err != nil {
		return err
	}
	return admins.Upsert(ctx, &models.AdminUser{
		Email:        email,
		PasswordHash: hash,
		DisplayName:  deriveDisplayName(email),
	})
}

func deriveDisplayName(email string) string {
	if i := strings.IndexByte(email, '@'); i > 0 {
		return email[:i]
	}
	return email
}
