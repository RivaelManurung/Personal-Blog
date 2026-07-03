// Package middleware provides Fiber v2 HTTP middleware for the blog backend:
// request id propagation, structured access logging, rate limiting, and
// admin authentication.
package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const (
	requestIDHeader = "X-Request-ID"
	requestIDLocal  = "requestid"
)

// RequestID generates a UUID for each request lacking an X-Request-ID
// header, stores it in c.Locals, and echoes it back on the response.
func RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Get(requestIDHeader)
		if id == "" {
			id = uuid.NewString()
		}
		c.Locals(requestIDLocal, id)
		c.Set(requestIDHeader, id)
		return c.Next()
	}
}

// RequestIDFrom returns the request id stored on the context by RequestID,
// or "" if absent.
func RequestIDFrom(c *fiber.Ctx) string {
	id, _ := c.Locals(requestIDLocal).(string)
	return id
}
