package database

import (
	"net/url"
	"strconv"
	"time"

	"github.com/rivael/blog-backend/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// withStatementTimeout appends statement_timeout (in ms) as a query parameter to
// a postgres:// URL DSN. pgx/lib/pq forward unknown params as Postgres runtime
// GUCs, so this bounds every query at the session level without touching request
// handling. If the DSN can't be parsed or the param is already present, the
// original DSN is returned unchanged rather than crashing the boot.
func withStatementTimeout(dsn string, timeoutMS int) string {
	u, err := url.Parse(dsn)
	if err != nil {
		return dsn
	}
	q := u.Query()
	if q.Has("statement_timeout") {
		return dsn
	}
	q.Set("statement_timeout", strconv.Itoa(timeoutMS))
	u.RawQuery = q.Encode()
	return u.String()
}

// Connect opens a tuned PostgreSQL connection pool.
//
// Schema is owned by golang-migrate (cmd/migrate). AutoMigrate runs only in
// development as a convenience; in production the migration step is authoritative.
func Connect(cfg *config.Config) (*gorm.DB, error) {
	logLevel := logger.Warn
	if cfg.IsProduction() {
		logLevel = logger.Error
	}

	dsn := withStatementTimeout(cfg.DatabaseURL, cfg.StatementTimeoutMS)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)

	// Schema is owned exclusively by golang-migrate (cmd/migrate). AutoMigrate is
	// intentionally NOT used — it cannot express the enum, FK actions, or the
	// generated tsvector column, and fights the migration-created constraints.

	return db, nil
}
