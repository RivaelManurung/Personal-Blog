package config

import (
	"strings"
	"testing"
)

// setValidBase sets the minimum env needed to get past the DATABASE_URL check so
// the numeric-bounds validation is what actually decides the outcome.
func setValidBase(t *testing.T) {
	t.Helper()
	t.Setenv("DATABASE_URL", "postgres://user:pass@localhost:5432/blog?sslmode=disable")
	t.Setenv("APP_ENV", "development")
}

func TestLoad_FailsOnZeroRateLimitRPS(t *testing.T) {
	// Arrange
	setValidBase(t)
	t.Setenv("RATE_LIMIT_RPS", "0")

	// Act
	cfg, err := Load()

	// Assert
	if err == nil {
		t.Fatalf("expected error for RATE_LIMIT_RPS=0, got cfg=%+v", cfg)
	}
	if !strings.Contains(err.Error(), "RATE_LIMIT_RPS") {
		t.Fatalf("expected RATE_LIMIT_RPS in error, got: %v", err)
	}
}

func TestLoad_FailsOnZeroMediaMaxBytes(t *testing.T) {
	// Arrange
	setValidBase(t)
	t.Setenv("MEDIA_MAX_BYTES", "0")

	// Act
	cfg, err := Load()

	// Assert
	if err == nil {
		t.Fatalf("expected error for MEDIA_MAX_BYTES=0, got cfg=%+v", cfg)
	}
	if !strings.Contains(err.Error(), "MEDIA_MAX_BYTES") {
		t.Fatalf("expected MEDIA_MAX_BYTES in error, got: %v", err)
	}
}

func TestLoad_SucceedsWithValidDefaults(t *testing.T) {
	// Arrange
	setValidBase(t)

	// Act
	cfg, err := Load()

	// Assert
	if err != nil {
		t.Fatalf("expected valid config to load, got: %v", err)
	}
	if cfg.RateLimitRPS <= 0 || cfg.MediaMaxBytes <= 0 {
		t.Fatalf("expected positive numeric defaults, got RPS=%d MaxBytes=%d", cfg.RateLimitRPS, cfg.MediaMaxBytes)
	}
}
