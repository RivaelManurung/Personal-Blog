// Command migrate applies or rolls back database schema migrations.
//
// Usage:
//
//	go run ./cmd/migrate up
//	go run ./cmd/migrate down       # roll back one step
//	go run ./cmd/migrate version
package main

import (
	"errors"
	"log"
	"os"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/rivael/blog-backend/internal/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	cmd := "up"
	if len(os.Args) > 1 {
		cmd = os.Args[1]
	}

	m, err := migrate.New("file://migrations", cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("migrate init error: %v", err)
	}
	defer m.Close()

	switch cmd {
	case "up":
		err = m.Up()
	case "down":
		err = m.Steps(-1)
	case "drop":
		err = m.Drop()
	case "version":
		v, dirty, verr := m.Version()
		if verr != nil {
			log.Fatalf("version error: %v", verr)
		}
		log.Printf("version=%d dirty=%v", v, dirty)
		return
	default:
		log.Fatalf("unknown command %q (use up|down|drop|version)", cmd)
	}

	if err != nil && !errors.Is(err, migrate.ErrNoChange) {
		log.Fatalf("migrate %s error: %v", cmd, err)
	}
	log.Printf("migrate %s: ok", cmd)
}
