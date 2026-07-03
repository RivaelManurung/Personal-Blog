package service

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/rivael/blog-backend/internal/config"
)

// Revalidator notifies the public frontend (e.g. Next.js ISR) that certain
// cache tags should be invalidated after content changes.
type Revalidator struct {
	url    string
	secret string
	client *http.Client
}

// NewRevalidator builds a Revalidator from application config. When
// cfg.RevalidateURL is empty, Trigger becomes a no-op.
func NewRevalidator(cfg *config.Config) *Revalidator {
	return &Revalidator{
		url:    cfg.RevalidateURL,
		secret: cfg.RevalidateSecret,
		client: &http.Client{Timeout: 5 * time.Second},
	}
}

// Trigger asynchronously POSTs {"tags": tags} to the configured revalidate
// webhook. It never blocks the caller and never panics; failures are logged.
func (r *Revalidator) Trigger(tags []string) {
	if r.url == "" || len(tags) == 0 {
		return
	}

	go func() {
		defer func() {
			if rec := recover(); rec != nil {
				slog.Error("revalidate: recovered from panic", "recover", rec)
			}
		}()

		body, err := json.Marshal(map[string][]string{"tags": tags})
		if err != nil {
			slog.Error("revalidate: marshal payload", "error", err)
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		req, err := http.NewRequestWithContext(ctx, http.MethodPost, r.url, bytes.NewReader(body))
		if err != nil {
			slog.Error("revalidate: build request", "error", err)
			return
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("x-revalidate-secret", r.secret)

		resp, err := r.client.Do(req)
		if err != nil {
			slog.Error("revalidate: request failed", "error", err)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode >= 300 {
			slog.Error("revalidate: unexpected status", "status", resp.StatusCode)
		}
	}()
}

// PostTags builds the set of cache tags associated with a post, its category,
// and its tags. categorySlug and tagSlugs may be empty/nil.
func PostTags(slug, categorySlug string, tagSlugs []string) []string {
	tags := make([]string, 0, len(tagSlugs)+3)
	tags = append(tags, "posts", "post:"+slug)
	if categorySlug != "" {
		tags = append(tags, "category:"+categorySlug)
	}
	for _, t := range tagSlugs {
		tags = append(tags, "tag:"+t)
	}
	return tags
}
