package handlers

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/rivael/blog-backend/internal/repository"
)

const (
	defaultLimit = 10
	maxLimit     = 50
)

// pagination reads ?page & ?limit with clamping (page>=1, 1<=limit<=maxLimit).
func pagination(c *fiber.Ctx) (page, limit int) {
	page = atoiDefault(c.Query("page"), 1)
	if page < 1 {
		page = 1
	}
	limit = atoiDefault(c.Query("limit"), defaultLimit)
	if limit < 1 {
		limit = defaultLimit
	}
	if limit > maxLimit {
		limit = maxLimit
	}
	return page, limit
}

func atoiDefault(s string, def int) int {
	if s == "" {
		return def
	}
	if n, err := strconv.Atoi(s); err == nil {
		return n
	}
	return def
}

func paramID(c *fiber.Ctx) (int64, bool) {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil || id <= 0 {
		return 0, false
	}
	return id, true
}

func totalPages(total int64, limit int) int {
	if limit <= 0 {
		return 0
	}
	return int((total + int64(limit) - 1) / int64(limit))
}

// isUniqueViolation reports a Postgres unique-constraint error (SQLSTATE 23505).
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

// mapWriteError converts a repo/service write error into an HTTP response.
func mapWriteError(c *fiber.Ctx, err error, conflictMsg string) error {
	switch {
	case repository.IsNotFound(err):
		return fail(c, fiber.StatusNotFound, "not found")
	case isUniqueViolation(err):
		return fail(c, fiber.StatusConflict, conflictMsg)
	default:
		return fail(c, fiber.StatusInternalServerError, "internal error")
	}
}
