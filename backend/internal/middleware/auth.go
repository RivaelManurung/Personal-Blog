package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	"github.com/rivael/blog-backend/internal/models"
	"github.com/rivael/blog-backend/internal/repository"
	"github.com/rivael/blog-backend/internal/token"
)

const (
	adminIDLocal = "adminID"
	adminLocal   = "admin"
)

// unauthorized writes the shared 401 envelope.
func unauthorized(c *fiber.Ctx) error {
	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
		"success": false,
		"error":   "unauthorized",
	})
}

// RequireAuth validates the Bearer access token on the Authorization header,
// loads the admin, and rejects requests whose token version has been
// revoked. On success it stores the admin id and record on the context.
func RequireAuth(tokens *token.Manager, admins repository.AdminRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get(fiber.HeaderAuthorization)
		const prefix = "Bearer "
		if header == "" || !strings.HasPrefix(header, prefix) {
			return unauthorized(c)
		}
		tokenStr := strings.TrimSpace(strings.TrimPrefix(header, prefix))
		if tokenStr == "" {
			return unauthorized(c)
		}

		claims, err := tokens.Parse(tokenStr, token.Access)
		if err != nil {
			return unauthorized(c)
		}

		admin, err := admins.FindByID(c.Context(), claims.AdminID)
		if err != nil {
			return unauthorized(c)
		}

		if claims.TokenVersion != admin.TokenVersion {
			return unauthorized(c)
		}

		c.Locals(adminIDLocal, admin.ID)
		c.Locals(adminLocal, admin)
		return c.Next()
	}
}

// AdminIDFrom returns the authenticated admin's id, or 0 if absent.
func AdminIDFrom(c *fiber.Ctx) int64 {
	id, _ := c.Locals(adminIDLocal).(int64)
	return id
}

// AdminFrom returns the authenticated admin record, or nil if absent.
func AdminFrom(c *fiber.Ctx) *models.AdminUser {
	admin, _ := c.Locals(adminLocal).(*models.AdminUser)
	return admin
}
