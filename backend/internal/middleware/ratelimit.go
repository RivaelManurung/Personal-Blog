package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

// rateLimitExceeded writes the shared 429 envelope for both limiters.
func rateLimitExceeded(c *fiber.Ctx) error {
	return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
		"success": false,
		"error":   "rate limit exceeded",
	})
}

// Global rate-limits every request by client IP to rps requests per second.
func Global(rps int) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        rps,
		Expiration: 1 * time.Second,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: rateLimitExceeded,
	})
}

// LoginLimiter rate-limits login attempts by client IP to protect against
// brute-force attacks on /auth/login.
func LoginLimiter() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        5,
		Expiration: 15 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: rateLimitExceeded,
	})
}

// RefreshLimiter rate-limits token refreshes by client IP — looser than login
// (legit clients refresh periodically) but still bounded for defense-in-depth.
func RefreshLimiter() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        30,
		Expiration: 15 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: rateLimitExceeded,
	})
}
