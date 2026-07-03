package main

import (
	"context"
	"log"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/rivael/blog-backend/internal/config"
	"github.com/rivael/blog-backend/internal/database"
	"github.com/rivael/blog-backend/internal/handlers"
	"github.com/rivael/blog-backend/internal/middleware"
	"github.com/rivael/blog-backend/internal/repository"
	"github.com/rivael/blog-backend/internal/routes"
	"github.com/rivael/blog-backend/internal/service"
	"github.com/rivael/blog-backend/internal/token"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	logger := newLogger(cfg.LogLevel)
	slog.SetDefault(logger)

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("database error: %v", err)
	}

	// --- Dependency injection ---
	adminRepo := repository.NewAdminRepository(db)
	postRepo := repository.NewPostRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	tagRepo := repository.NewTagRepository(db)
	mediaRepo := repository.NewMediaRepository(db)

	tokens := token.NewManager(cfg.JWTSecret, cfg.AccessTokenTTL, cfg.RefreshTokenTTL)
	reval := service.NewRevalidator(cfg)

	authSvc := service.NewAuthService(adminRepo, tokens, cfg)
	postSvc := service.NewPostService(postRepo, tagRepo, reval)
	taxonomySvc := service.NewTaxonomyService(categoryRepo, tagRepo, reval)
	mediaSvc := service.NewMediaService(mediaRepo, cfg)

	// --- Boot guard: ensure the admin and default content exist ---
	if err := service.EnsureAdmin(context.Background(), adminRepo, cfg.AdminEmail, cfg.AdminPassword); err != nil {
		logger.Warn("could not ensure admin user", "error", err)
	}
	if err := service.EnsureAboutPageForAdmin(context.Background(), adminRepo, postRepo, cfg.AdminEmail); err != nil {
		logger.Warn("could not ensure about page", "error", err)
	}

	// --- Background scheduler: promote due scheduled posts ---
	schedulerCtx, stopScheduler := context.WithCancel(context.Background())
	defer stopScheduler()
	go service.NewScheduler(db, reval, time.Minute).Run(schedulerCtx)

	// --- HTTP app ---
	app := fiber.New(fiber.Config{
		AppName:               "blog-backend",
		BodyLimit:             int(cfg.MediaMaxBytes) + (1 << 20), // media cap + headroom
		DisableStartupMessage: true,
	})

	app.Use(recover.New())
	app.Use(middleware.RequestID())
	app.Use(middleware.Logger(logger))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowOriginsFunc: func(origin string) bool { return !cfg.IsProduction() },
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: true,
	}))
	app.Use(middleware.Global(cfg.RateLimitRPS))

	// Liveness: process is up, no dependency checks.
	app.Get("/livez", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// Readiness: verify the database is reachable.
	app.Get("/readyz", func(c *fiber.Ctx) error {
		sqlDB, err := db.DB()
		if err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"status": "unavailable"})
		}
		ctx, cancel := context.WithTimeout(c.Context(), 2*time.Second)
		defer cancel()
		if err := sqlDB.PingContext(ctx); err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"status": "unavailable"})
		}
		return c.JSON(fiber.Map{"status": "ready"})
	})

	// Serve uploaded media (local storage driver) with explicit cross-origin policy.
	app.Use("/uploads", func(c *fiber.Ctx) error {
		c.Set("Access-Control-Allow-Origin", "*")
		c.Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		c.Set("Access-Control-Allow-Headers", "*")
		c.Set("Cross-Origin-Resource-Policy", "cross-origin")
		if c.Method() == "OPTIONS" {
			return c.SendStatus(fiber.StatusNoContent)
		}
		return c.Next()
	})
	app.Static("/uploads", cfg.StoragePath)

	routes.Register(app, routes.Handlers{
		Auth:     handlers.NewAuthHandler(authSvc),
		Post:     handlers.NewPostHandler(postRepo, postSvc),
		Taxonomy: handlers.NewTaxonomyHandler(categoryRepo, tagRepo, postRepo, taxonomySvc),
		Media:    handlers.NewMediaHandler(mediaRepo, mediaSvc),
	}, middleware.RequireAuth(tokens, adminRepo), middleware.LoginLimiter(), middleware.RefreshLimiter())

	// --- Serve with graceful shutdown ---
	go func() {
		logger.Info("server listening", "port", cfg.Port, "env", cfg.AppEnv)
		if err := app.Listen(":" + cfg.Port); err != nil {
			logger.Error("server stopped", "error", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("shutting down")

	stopScheduler()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := app.ShutdownWithContext(ctx); err != nil {
		logger.Error("graceful shutdown failed", "error", err)
	}
	if sqlDB, derr := db.DB(); derr == nil {
		_ = sqlDB.Close()
	}
	logger.Info("stopped")
}

func newLogger(level string) *slog.Logger {
	var lvl slog.Level
	switch level {
	case "debug":
		lvl = slog.LevelDebug
	case "warn":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: lvl}))
}
