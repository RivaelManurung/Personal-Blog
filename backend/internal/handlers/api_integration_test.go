//go:build integration

package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rivael/blog-backend/internal/config"
	"github.com/rivael/blog-backend/internal/handlers"
	"github.com/rivael/blog-backend/internal/middleware"
	"github.com/rivael/blog-backend/internal/repository"
	"github.com/rivael/blog-backend/internal/routes"
	"github.com/rivael/blog-backend/internal/service"
	"github.com/rivael/blog-backend/internal/token"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

const (
	apiTestAdminEmail    = "api-admin@example.com"
	apiTestAdminPassword = "super-secret-password"
)

// apiTestDB opens a connection to TEST_DATABASE_URL, skipping the test if
// unset, and truncates the tables touched by this test.
func apiTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("set TEST_DATABASE_URL to run integration tests")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err, "open test database")

	require.NoError(t, db.Exec(`TRUNCATE TABLE post_tags, posts, categories, tags, media, admin_users RESTART IDENTITY CASCADE`).Error)

	return db
}

// buildAPITestApp wires the full application (repositories, services,
// handlers, routes) against db, exactly as cmd/server/main.go does, and
// seeds a single admin user.
func buildAPITestApp(t *testing.T, db *gorm.DB) *fiber.App {
	t.Helper()

	cfg := &config.Config{
		AppEnv:          "test",
		JWTSecret:       "integration-test-secret",
		AccessTokenTTL:  15 * time.Minute,
		RefreshTokenTTL: 168 * time.Hour,
		StorageDriver:   "local",
		StoragePath:     t.TempDir(),
		MediaMaxBytes:   5 << 20,
		RateLimitRPS:    1000,
	}

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

	require.NoError(t, service.ResetAdminPassword(context.Background(), adminRepo, apiTestAdminEmail, apiTestAdminPassword))

	app := fiber.New()
	routes.Register(app, routes.Handlers{
		Auth:     handlers.NewAuthHandler(authSvc),
		Post:     handlers.NewPostHandler(postRepo, postSvc),
		Taxonomy: handlers.NewTaxonomyHandler(categoryRepo, tagRepo, postRepo, taxonomySvc),
		Media:    handlers.NewMediaHandler(mediaRepo, mediaSvc),
	}, middleware.RequireAuth(tokens, adminRepo), middleware.LoginLimiter(), middleware.RefreshLimiter())

	return app
}

type apiEnvelope struct {
	Success bool            `json:"success"`
	Data    json.RawMessage `json:"data"`
	Error   string          `json:"error"`
}

func doJSON(t *testing.T, app *fiber.App, method, path, token string, body any) (*apiEnvelope, int) {
	t.Helper()

	var reader *bytes.Reader
	if body != nil {
		b, err := json.Marshal(body)
		require.NoError(t, err)
		reader = bytes.NewReader(b)
	} else {
		reader = bytes.NewReader(nil)
	}

	req := httptest.NewRequest(method, path, reader)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	defer resp.Body.Close()

	var env apiEnvelope
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&env))
	return &env, resp.StatusCode
}

// TestAPI_AuthAndPostLifecycle exercises the full admin auth + post CRUD
// flow against a real database and the wired-up Fiber app.
func TestAPI_AuthAndPostLifecycle(t *testing.T) {
	// Arrange
	db := apiTestDB(t)
	app := buildAPITestApp(t, db)

	// Act + Assert: login succeeds and returns a usable access token.
	loginEnv, status := doJSON(t, app, "POST", "/api/v1/auth/login", "", map[string]string{
		"email":    apiTestAdminEmail,
		"password": apiTestAdminPassword,
	})
	require.Equal(t, fiber.StatusOK, status)
	require.True(t, loginEnv.Success)

	var loginData struct {
		AccessToken string `json:"accessToken"`
	}
	require.NoError(t, json.Unmarshal(loginEnv.Data, &loginData))
	require.NotEmpty(t, loginData.AccessToken)

	// Admin routes reject requests without a token.
	_, status = doJSON(t, app, "GET", "/api/v1/admin/posts", "", nil)
	require.Equal(t, fiber.StatusUnauthorized, status)

	// Admin routes accept a valid token.
	adminListEnv, status := doJSON(t, app, "GET", "/api/v1/admin/posts", loginData.AccessToken, nil)
	require.Equal(t, fiber.StatusOK, status)
	require.True(t, adminListEnv.Success)

	// Create a published post.
	createEnv, status := doJSON(t, app, "POST", "/api/v1/admin/posts", loginData.AccessToken, map[string]any{
		"title":   "Integration Test Post",
		"content": "<p>hello world</p>",
		"status":  "published",
	})
	require.Equal(t, fiber.StatusCreated, status)
	require.True(t, createEnv.Success)

	var created struct {
		ID   int64  `json:"id"`
		Slug string `json:"slug"`
	}
	require.NoError(t, json.Unmarshal(createEnv.Data, &created))
	require.NotZero(t, created.ID)

	// The public list should now surface the published post.
	publicListEnv, status := doJSON(t, app, "GET", "/api/v1/posts", "", nil)
	require.Equal(t, fiber.StatusOK, status)
	require.True(t, publicListEnv.Success)

	var publicPosts []struct {
		Slug string `json:"slug"`
	}
	require.NoError(t, json.Unmarshal(publicListEnv.Data, &publicPosts))
	found := false
	for _, p := range publicPosts {
		if p.Slug == created.Slug {
			found = true
			break
		}
	}
	require.True(t, found, "published post should be visible in the public list")

	// Delete the post.
	deleteEnv, status := doJSON(t, app, "DELETE", "/api/v1/admin/posts/"+strconv.FormatInt(created.ID, 10), loginData.AccessToken, nil)
	require.Equal(t, fiber.StatusOK, status)
	require.True(t, deleteEnv.Success)

	// It should no longer be resolvable by slug.
	_, status = doJSON(t, app, "GET", "/api/v1/posts/"+created.Slug, "", nil)
	require.Equal(t, fiber.StatusNotFound, status)
}
