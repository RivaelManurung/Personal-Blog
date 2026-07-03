package service

import (
	"context"
	"fmt"
	"strings"
	"time"

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

// EnsureAboutPage creates the default About page if no post with slug "about" exists.
func EnsureAboutPage(ctx context.Context, posts repository.PostRepository, authorID int64) error {
	if _, err := posts.FindBySlug(ctx, "about", false); err == nil {
		return nil // already exists
	} else if !repository.IsNotFound(err) {
		return err
	}

	now := time.Now().UTC()
	post := &models.Post{
		Title:          "A journal of life's spectrum.",
		Slug:           "about",
		Excerpt:        "About AshGray — reflections, inspiration, and discovery across life's spectrum.",
		Content:        `<p>AshGray is a personal editorial blog — a slow, deliberate space for reflection, inspiration, and discovery.</p><p>Here you'll find long-form essays and short field notes across life, culture, the mind, travel, and craft. Every piece is written to be read unhurried, in the way you might linger over a good magazine on a quiet morning.</p><p>There is no algorithm here, no infinite feed — just writing, arranged with care. If a story stays with you, that's the whole point.</p>`,
		ContentFormat:  "html",
		AuthorID:       authorID,
		Status:         models.StatusPublished,
		PublishedAt:    &now,
		ReadingTimeMin: 1,
		SEOTitle:       "About",
		SEODescription: "About AshGray — reflections, inspiration, and discovery across life's spectrum.",
	}
	return posts.Create(ctx, post)
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
