package middleware

import (
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v2"
)

// Logger returns a structured access-log middleware built on log/slog. It
// never logs the Authorization header, cookies, or the request body. 5xx
// responses are logged at Error level; everything else at Info level.
func Logger(log *slog.Logger) fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		err := c.Next()

		status := c.Response().StatusCode()
		latencyMS := float64(time.Since(start)) / float64(time.Millisecond)

		attrs := []any{
			slog.String("method", c.Method()),
			slog.String("path", c.Path()),
			slog.Int("status", status),
			slog.Float64("latency_ms", latencyMS),
			slog.String("request_id", RequestIDFrom(c)),
			slog.String("client_ip", c.IP()),
		}

		if status >= fiber.StatusInternalServerError {
			log.Error("http request", attrs...)
		} else {
			log.Info("http request", attrs...)
		}

		return err
	}
}
