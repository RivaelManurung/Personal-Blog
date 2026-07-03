package service

import (
	"context"

	"github.com/rivael/blog-backend/internal/dto"
	"github.com/rivael/blog-backend/internal/models"
	"github.com/rivael/blog-backend/internal/repository"
)

// TaxonomyService implements CRUD for categories and tags.
type TaxonomyService struct {
	cats  repository.CategoryRepository
	tags  repository.TagRepository
	reval *Revalidator
}

// NewTaxonomyService constructs a TaxonomyService.
func NewTaxonomyService(cats repository.CategoryRepository, tags repository.TagRepository, reval *Revalidator) *TaxonomyService {
	return &TaxonomyService{cats: cats, tags: tags, reval: reval}
}

// triggerReval fires a best-effort cache revalidation for the given tags.
func (s *TaxonomyService) triggerReval(tags []string) {
	if s.reval == nil {
		return
	}
	s.reval.Trigger(tags)
}

// CreateCategory persists a new category, slugifying the name when no slug
// is supplied.
func (s *TaxonomyService) CreateCategory(ctx context.Context, req dto.CategoryRequest) (*models.Category, error) {
	slug := req.Slug
	if slug == "" {
		slug = Slugify(req.Name)
	}

	cat := &models.Category{
		Name:        req.Name,
		Slug:        slug,
		Description: req.Description,
	}
	if err := s.cats.Create(ctx, cat); err != nil {
		return nil, err
	}
	s.triggerReval([]string{"categories", "posts"})
	return cat, nil
}

// UpdateCategory replaces the fields of an existing category.
func (s *TaxonomyService) UpdateCategory(ctx context.Context, id int64, req dto.CategoryRequest) (*models.Category, error) {
	existing, err := s.cats.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	slug := req.Slug
	if slug == "" {
		slug = Slugify(req.Name)
	}

	existing.Name = req.Name
	existing.Slug = slug
	existing.Description = req.Description

	if err := s.cats.Update(ctx, existing); err != nil {
		return nil, err
	}
	s.triggerReval([]string{"categories", "posts"})
	return existing, nil
}

// DeleteCategory removes a category by id.
func (s *TaxonomyService) DeleteCategory(ctx context.Context, id int64) (bool, error) {
	ok, err := s.cats.Delete(ctx, id)
	if err != nil {
		return false, err
	}
	if ok {
		s.triggerReval([]string{"categories", "posts"})
	}
	return ok, nil
}

// CreateTag persists a new tag, slugifying the name when no slug is
// supplied.
func (s *TaxonomyService) CreateTag(ctx context.Context, req dto.TagRequest) (*models.Tag, error) {
	slug := req.Slug
	if slug == "" {
		slug = Slugify(req.Name)
	}

	tag := &models.Tag{
		Name: req.Name,
		Slug: slug,
	}
	if err := s.tags.Create(ctx, tag); err != nil {
		return nil, err
	}
	s.triggerReval([]string{"tags", "posts"})
	return tag, nil
}

// UpdateTag replaces the fields of an existing tag.
func (s *TaxonomyService) UpdateTag(ctx context.Context, id int64, req dto.TagRequest) (*models.Tag, error) {
	existing, err := s.tags.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	slug := req.Slug
	if slug == "" {
		slug = Slugify(req.Name)
	}

	existing.Name = req.Name
	existing.Slug = slug

	if err := s.tags.Update(ctx, existing); err != nil {
		return nil, err
	}
	s.triggerReval([]string{"tags", "posts"})
	return existing, nil
}

// DeleteTag removes a tag by id.
func (s *TaxonomyService) DeleteTag(ctx context.Context, id int64) (bool, error) {
	ok, err := s.tags.Delete(ctx, id)
	if err != nil {
		return false, err
	}
	if ok {
		s.triggerReval([]string{"tags", "posts"})
	}
	return ok, nil
}
