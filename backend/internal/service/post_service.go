package service

import (
	"context"
	"regexp"
	"strings"
	"time"

	"github.com/microcosm-cc/bluemonday"
	"github.com/rivael/blog-backend/internal/dto"
	"github.com/rivael/blog-backend/internal/models"
	"github.com/rivael/blog-backend/internal/repository"
)

var (
	slugInvalidRunRe = regexp.MustCompile(`[^a-z0-9]+`)
	tagStripRe       = regexp.MustCompile(`<[^>]*>`)
	wordSplitRe      = regexp.MustCompile(`\s+`)

	ugcPolicy = bluemonday.UGCPolicy()
)

const wordsPerMinute = 200

// Slugify lowercases s, replaces runs of non [a-z0-9] characters with a
// single '-', and trims leading/trailing '-'.
func Slugify(s string) string {
	lower := strings.ToLower(s)
	slug := slugInvalidRunRe.ReplaceAllString(lower, "-")
	return strings.Trim(slug, "-")
}

// PostService implements post CRUD and publish-status transitions.
type PostService struct {
	posts repository.PostRepository
	tags  repository.TagRepository
	reval *Revalidator
}

// NewPostService constructs a PostService.
func NewPostService(posts repository.PostRepository, tags repository.TagRepository, reval *Revalidator) *PostService {
	return &PostService{posts: posts, tags: tags, reval: reval}
}

// Create builds and persists a new post from req, authored by authorID.
func (s *PostService) Create(ctx context.Context, authorID int64, req dto.CreatePostRequest) (*models.Post, error) {
	slug := req.Slug
	if slug == "" {
		slug = Slugify(req.Title)
	}

	format := req.ContentFormat
	if format == "" {
		format = "html"
	}

	content := req.Content
	if format == "html" {
		content = ugcPolicy.Sanitize(content)
	}

	status := models.PostStatus(req.Status)
	if status == "" {
		status = models.StatusDraft
	}

	publishedAt := req.PublishedAt
	if status == models.StatusPublished && publishedAt == nil {
		now := time.Now()
		publishedAt = &now
	}

	tagIDs, err := s.tags.ExistingIDs(ctx, req.TagIDs)
	if err != nil {
		return nil, err
	}

	post := &models.Post{
		Title:          req.Title,
		Slug:           slug,
		Excerpt:        req.Excerpt,
		Content:        content,
		ContentFormat:  format,
		CategoryID:     req.CategoryID,
		CoverImageID:   req.CoverImageID,
		OGImageID:      req.OGImageID,
		AuthorID:       authorID,
		Status:         status,
		PublishedAt:    publishedAt,
		ReadingTimeMin: readingTime(content),
		SEOTitle:       req.SEOTitle,
		SEODescription: req.SEODescription,
		CanonicalURL:   req.CanonicalURL,
	}

	if err := s.posts.CreateWithTags(ctx, post, tagIDs); err != nil {
		return nil, err
	}

	saved, err := s.posts.FindByID(ctx, post.ID)
	if err != nil {
		return nil, err
	}

	s.triggerReval(saved)

	return saved, nil
}

// Update replaces the mutable fields of the post identified by id.
func (s *PostService) Update(ctx context.Context, id int64, req dto.UpdatePostRequest) (*models.Post, error) {
	existing, err := s.posts.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	slug := req.Slug
	if slug == "" {
		slug = Slugify(req.Title)
	}

	format := req.ContentFormat
	if format == "" {
		format = "html"
	}

	content := req.Content
	if format == "html" {
		content = ugcPolicy.Sanitize(content)
	}

	status := models.PostStatus(req.Status)
	if status == "" {
		status = models.StatusDraft
	}

	publishedAt := req.PublishedAt
	if status == models.StatusPublished && publishedAt == nil {
		now := time.Now()
		publishedAt = &now
	}

	tagIDs, err := s.tags.ExistingIDs(ctx, req.TagIDs)
	if err != nil {
		return nil, err
	}

	existing.Title = req.Title
	existing.Slug = slug
	existing.Excerpt = req.Excerpt
	existing.Content = content
	existing.ContentFormat = format
	existing.CategoryID = req.CategoryID
	existing.CoverImageID = req.CoverImageID
	existing.OGImageID = req.OGImageID
	existing.Status = status
	existing.PublishedAt = publishedAt
	existing.ReadingTimeMin = readingTime(content)
	existing.SEOTitle = req.SEOTitle
	existing.SEODescription = req.SEODescription
	existing.CanonicalURL = req.CanonicalURL

	if err := s.posts.UpdateWithTags(ctx, existing, tagIDs); err != nil {
		return nil, err
	}

	saved, err := s.posts.FindByID(ctx, existing.ID)
	if err != nil {
		return nil, err
	}

	s.triggerReval(saved)

	return saved, nil
}

// Delete removes the post identified by id, firing a best-effort cache
// revalidation on success.
func (s *PostService) Delete(ctx context.Context, id int64) (bool, error) {
	existing, err := s.posts.FindByID(ctx, id)
	if err != nil {
		if repository.IsNotFound(err) {
			return false, nil
		}
		return false, err
	}

	ok, err := s.posts.Delete(ctx, id)
	if err != nil {
		return false, err
	}
	if ok {
		s.triggerReval(existing)
	}
	return ok, nil
}

// SetStatus transitions a post's publish status, setting publishedAt on
// first publish when not explicitly provided.
func (s *PostService) SetStatus(ctx context.Context, id int64, status models.PostStatus, publishedAt *time.Time) (*models.Post, error) {
	existing, err := s.posts.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if status == models.StatusPublished && publishedAt == nil && existing.PublishedAt == nil {
		now := time.Now()
		publishedAt = &now
	} else if publishedAt == nil {
		publishedAt = existing.PublishedAt
	}

	existing.Status = status
	existing.PublishedAt = publishedAt

	if err := s.posts.Update(ctx, existing); err != nil {
		return nil, err
	}

	saved, err := s.posts.FindByID(ctx, existing.ID)
	if err != nil {
		return nil, err
	}

	s.triggerReval(saved)

	return saved, nil
}

// triggerReval fires a best-effort cache revalidation for a post's tags.
func (s *PostService) triggerReval(p *models.Post) {
	if s.reval == nil || p == nil {
		return
	}

	categorySlug := ""
	if p.Category != nil {
		categorySlug = p.Category.Slug
	}

	tagSlugs := make([]string, 0, len(p.Tags))
	for _, t := range p.Tags {
		tagSlugs = append(tagSlugs, t.Slug)
	}

	s.reval.Trigger(PostTags(p.Slug, categorySlug, tagSlugs))
}

// readingTime estimates minutes to read the given (possibly HTML) content.
func readingTime(content string) int {
	plain := tagStripRe.ReplaceAllString(content, " ")
	words := wordSplitRe.Split(strings.TrimSpace(plain), -1)
	count := 0
	for _, w := range words {
		if w != "" {
			count++
		}
	}
	minutes := count / wordsPerMinute
	if minutes < 1 {
		minutes = 1
	}
	return minutes
}
