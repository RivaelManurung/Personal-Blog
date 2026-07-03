package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration, sourced from environment variables.
type Config struct {
	AppEnv      string
	Port        string
	DatabaseURL string
	CORSOrigins string

	// Auth
	JWTSecret       string
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration
	AdminEmail      string
	AdminPassword   string

	// Media storage
	StorageDriver string // "local" | "s3"
	StoragePath   string
	MediaMaxBytes int64

	// Public URLs & cache revalidation webhook
	PublicBaseURL    string
	RevalidateURL    string
	RevalidateSecret string

	// Operational
	RateLimitRPS       int
	LogLevel           string
	StatementTimeoutMS int
}

// IsProduction reports whether the app runs in the production environment.
func (c *Config) IsProduction() bool { return c.AppEnv == "production" }

// Load reads configuration from a .env file (if present) and the environment.
// It fails fast when a required value is missing.
func Load() (*Config, error) {
	// .env is optional; ignore the error when the file does not exist.
	_ = godotenv.Load()

	cfg := &Config{
		AppEnv:      getEnv("APP_ENV", "development"),
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		CORSOrigins: getEnv("CORS_ORIGINS", "http://localhost:3000"),

		JWTSecret:       os.Getenv("JWT_SECRET"),
		AccessTokenTTL:  getEnvDuration("ACCESS_TOKEN_TTL", 15*time.Minute),
		RefreshTokenTTL: getEnvDuration("REFRESH_TOKEN_TTL", 7*24*time.Hour),
		AdminEmail:      getEnv("ADMIN_EMAIL", "admin@example.com"),
		AdminPassword:   os.Getenv("ADMIN_PASSWORD"),

		StorageDriver: getEnv("STORAGE_DRIVER", "local"),
		StoragePath:   getEnv("STORAGE_PATH", "storage/uploads"),
		MediaMaxBytes: getEnvInt64("MEDIA_MAX_BYTES", 5<<20), // 5 MiB

		PublicBaseURL:    getEnv("PUBLIC_BASE_URL", "http://localhost:3000"),
		RevalidateURL:    os.Getenv("REVALIDATE_URL"),
		RevalidateSecret: os.Getenv("REVALIDATE_SECRET"),

		RateLimitRPS:       getEnvInt("RATE_LIMIT_RPS", 20),
		LogLevel:           getEnv("LOG_LEVEL", "info"),
		StatementTimeoutMS: getEnvInt("STATEMENT_TIMEOUT_MS", 10000),
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	// Fail fast on invalid numeric bounds rather than silently booting with a
	// zero/negative value that would disable rate limiting, uploads, or tokens.
	if cfg.Port == "" {
		return nil, fmt.Errorf("PORT must not be empty")
	}
	if cfg.RateLimitRPS <= 0 {
		return nil, fmt.Errorf("RATE_LIMIT_RPS must be greater than 0, got %d", cfg.RateLimitRPS)
	}
	if cfg.MediaMaxBytes <= 0 {
		return nil, fmt.Errorf("MEDIA_MAX_BYTES must be greater than 0, got %d", cfg.MediaMaxBytes)
	}
	if cfg.StatementTimeoutMS <= 0 {
		return nil, fmt.Errorf("STATEMENT_TIMEOUT_MS must be greater than 0, got %d", cfg.StatementTimeoutMS)
	}
	if cfg.AccessTokenTTL <= 0 {
		return nil, fmt.Errorf("ACCESS_TOKEN_TTL must be greater than 0, got %s", cfg.AccessTokenTTL)
	}
	if cfg.RefreshTokenTTL <= 0 {
		return nil, fmt.Errorf("REFRESH_TOKEN_TTL must be greater than 0, got %s", cfg.RefreshTokenTTL)
	}

	// Fail-fast on secrets/config that must never fall back to a default in production.
	if cfg.IsProduction() {
		if cfg.JWTSecret == "" {
			return nil, fmt.Errorf("JWT_SECRET is required in production")
		}
		if cfg.PublicBaseURL == "" {
			return nil, fmt.Errorf("PUBLIC_BASE_URL is required in production")
		}
		// A wildcard CORS origin is incompatible with credentialed requests and
		// unsafe; require an explicit allowlist in production.
		if cfg.CORSOrigins == "" || strings.Contains(cfg.CORSOrigins, "*") {
			return nil, fmt.Errorf("CORS_ORIGINS must be an explicit allowlist (no '*') in production")
		}
	}
	// Outside production, provide a loud but non-fatal dev secret.
	if cfg.JWTSecret == "" {
		cfg.JWTSecret = "dev-insecure-jwt-secret-change-me"
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func getEnvInt64(key string, fallback int64) int64 {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			return n
		}
	}
	return fallback
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}
