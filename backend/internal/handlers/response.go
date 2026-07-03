package handlers

import "github.com/gofiber/fiber/v2"

// Meta carries pagination info for list endpoints.
type Meta struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"totalPages"`
}

// envelope is the consistent response shape for every endpoint.
type envelope struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Error   string      `json:"error,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
}

func ok(c *fiber.Ctx, status int, data interface{}) error {
	return c.Status(status).JSON(envelope{Success: true, Data: data})
}

// okPaginated returns data alongside pagination metadata.
func okPaginated(c *fiber.Ctx, data interface{}, meta Meta) error {
	return c.Status(fiber.StatusOK).JSON(envelope{Success: true, Data: data, Meta: &meta})
}

func fail(c *fiber.Ctx, status int, message string) error {
	return c.Status(status).JSON(envelope{Success: false, Data: nil, Error: message})
}
