// Command seed upserts the single admin user from ADMIN_EMAIL / ADMIN_PASSWORD.
// It is idempotent and safe to run repeatedly; it resets the admin password.
//
//	go run ./cmd/seed
package main

import (
	"context"
	"log"

	"github.com/rivael/blog-backend/internal/config"
	"github.com/rivael/blog-backend/internal/database"
	"github.com/rivael/blog-backend/internal/repository"
	"github.com/rivael/blog-backend/internal/service"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("database error: %v", err)
	}

	ctx := context.Background()
	admins := repository.NewAdminRepository(db)
	posts := repository.NewPostRepository(db)

	if err := service.ResetAdminPassword(ctx, admins, cfg.AdminEmail, cfg.AdminPassword); err != nil {
		log.Fatalf("seed admin: %v", err)
	}
	log.Printf("seeded admin: %s", cfg.AdminEmail)

	if err := service.EnsureAboutPageForAdmin(ctx, admins, posts, cfg.AdminEmail); err != nil {
		log.Fatalf("seed about page: %v", err)
	}
	log.Printf("seeded about page")
}
