package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/rivael/blog-backend/internal/handlers"
)

// Handlers bundles the HTTP handlers wired by Register.
type Handlers struct {
	Auth     *handlers.AuthHandler
	Post     *handlers.PostHandler
	Taxonomy *handlers.TaxonomyHandler
	Media    *handlers.MediaHandler
}

// Register mounts all routes. requireAuth guards admin/authenticated routes;
// loginLimiter and refreshLimiter throttle the auth endpoints.
func Register(app *fiber.App, h Handlers, requireAuth, loginLimiter, refreshLimiter fiber.Handler) {
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	api := app.Group("/api/v1")

	// ---- Public reads ----
	api.Get("/posts", h.Post.List)
	api.Get("/search", h.Post.Search)
	api.Get("/posts/:slug", h.Post.GetBySlug)
	api.Get("/categories", h.Taxonomy.ListCategories)
	api.Get("/categories/:slug/posts", h.Taxonomy.ListCategoryPosts)
	api.Get("/tags", h.Taxonomy.ListTags)
	api.Get("/tags/:slug/posts", h.Taxonomy.ListTagPosts)
	api.Get("/media/:id", h.Media.GetByID)

	// ---- Auth ----
	auth := api.Group("/auth")
	auth.Post("/login", loginLimiter, h.Auth.Login)
	auth.Post("/refresh", refreshLimiter, h.Auth.Refresh)
	auth.Post("/logout", requireAuth, h.Auth.Logout)
	auth.Get("/me", requireAuth, h.Auth.Me)
	auth.Put("/password", requireAuth, h.Auth.ChangePassword)

	// ---- Admin (JWT-protected) ----
	admin := api.Group("/admin", requireAuth)
	admin.Get("/stats", h.Post.Stats)

	admin.Get("/posts", h.Post.AdminList)
	admin.Post("/posts", h.Post.Create)
	admin.Get("/posts/:id", h.Post.AdminGet)
	admin.Put("/posts/:id", h.Post.Update)
	admin.Patch("/posts/:id/status", h.Post.UpdateStatus)
	admin.Delete("/posts/:id", h.Post.Delete)

	admin.Get("/categories", h.Taxonomy.ListCategories)
	admin.Post("/categories", h.Taxonomy.CreateCategory)
	admin.Put("/categories/:id", h.Taxonomy.UpdateCategory)
	admin.Delete("/categories/:id", h.Taxonomy.DeleteCategory)

	admin.Get("/tags", h.Taxonomy.ListTags)
	admin.Post("/tags", h.Taxonomy.CreateTag)
	admin.Put("/tags/:id", h.Taxonomy.UpdateTag)
	admin.Delete("/tags/:id", h.Taxonomy.DeleteTag)

	admin.Get("/media", h.Media.List)
	admin.Post("/media", h.Media.Upload)
	admin.Delete("/media/:id", h.Media.Delete)
}
