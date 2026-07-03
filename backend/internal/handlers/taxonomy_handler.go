package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/rivael/blog-backend/internal/dto"
	"github.com/rivael/blog-backend/internal/repository"
	"github.com/rivael/blog-backend/internal/service"
	"github.com/rivael/blog-backend/internal/validator"
)

// TaxonomyHandler serves category & tag reads (public) and writes (admin).
type TaxonomyHandler struct {
	cats  repository.CategoryRepository
	tags  repository.TagRepository
	posts repository.PostRepository
	svc   *service.TaxonomyService
}

func NewTaxonomyHandler(cats repository.CategoryRepository, tags repository.TagRepository, posts repository.PostRepository, svc *service.TaxonomyService) *TaxonomyHandler {
	return &TaxonomyHandler{cats: cats, tags: tags, posts: posts, svc: svc}
}

// ---------- Public ----------

func (h *TaxonomyHandler) ListCategories(c *fiber.Ctx) error {
	cats, counts, err := h.cats.ListWithCounts(c.Context())
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, "failed to fetch categories")
	}
	out := make([]dto.CategoryDTO, 0, len(cats))
	for i := range cats {
		cnt := counts[cats[i].ID]
		out = append(out, *dto.CategoryToDTO(&cats[i], &cnt))
	}
	return ok(c, fiber.StatusOK, out)
}

func (h *TaxonomyHandler) ListTags(c *fiber.Ctx) error {
	tags, counts, err := h.tags.ListWithCounts(c.Context())
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, "failed to fetch tags")
	}
	out := make([]dto.TagDTO, 0, len(tags))
	for i := range tags {
		cnt := counts[tags[i].ID]
		out = append(out, dto.TagToDTO(tags[i], &cnt))
	}
	return ok(c, fiber.StatusOK, out)
}

func (h *TaxonomyHandler) ListCategoryPosts(c *fiber.Ctx) error {
	return h.listPostsBy(c, repository.PostFilter{CategorySlug: c.Params("slug")})
}

func (h *TaxonomyHandler) ListTagPosts(c *fiber.Ctx) error {
	return h.listPostsBy(c, repository.PostFilter{TagSlug: c.Params("slug")})
}

func (h *TaxonomyHandler) listPostsBy(c *fiber.Ctx, base repository.PostFilter) error {
	page, limit := pagination(c)
	base.PublishedOnly = true
	base.Page = page
	base.Limit = limit
	base.Sort = c.Query("sort")
	items, total, err := h.posts.List(c.Context(), base)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, "failed to fetch posts")
	}
	out := make([]dto.PostSummaryDTO, 0, len(items))
	for i := range items {
		out = append(out, dto.PostToSummary(&items[i]))
	}
	return okPaginated(c, out, Meta{Page: page, Limit: limit, Total: total, TotalPages: totalPages(total, limit)})
}

// ---------- Admin: categories ----------

func (h *TaxonomyHandler) CreateCategory(c *fiber.Ctx) error {
	var req dto.CategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return fail(c, fiber.StatusBadRequest, "invalid request body")
	}
	if err := validator.Struct(req); err != nil {
		return fail(c, fiber.StatusUnprocessableEntity, err.Error())
	}
	cat, err := h.svc.CreateCategory(c.Context(), req)
	if err != nil {
		return mapWriteError(c, err, "a category with this slug already exists")
	}
	return ok(c, fiber.StatusCreated, dto.CategoryToDTO(cat, nil))
}

func (h *TaxonomyHandler) UpdateCategory(c *fiber.Ctx) error {
	id, ok2 := paramID(c)
	if !ok2 {
		return fail(c, fiber.StatusBadRequest, "invalid id")
	}
	var req dto.CategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return fail(c, fiber.StatusBadRequest, "invalid request body")
	}
	if err := validator.Struct(req); err != nil {
		return fail(c, fiber.StatusUnprocessableEntity, err.Error())
	}
	cat, err := h.svc.UpdateCategory(c.Context(), id, req)
	if err != nil {
		return mapWriteError(c, err, "a category with this slug already exists")
	}
	return ok(c, fiber.StatusOK, dto.CategoryToDTO(cat, nil))
}

func (h *TaxonomyHandler) DeleteCategory(c *fiber.Ctx) error {
	id, ok2 := paramID(c)
	if !ok2 {
		return fail(c, fiber.StatusBadRequest, "invalid id")
	}
	deleted, err := h.svc.DeleteCategory(c.Context(), id)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, "failed to delete category")
	}
	if !deleted {
		return fail(c, fiber.StatusNotFound, "category not found")
	}
	return ok(c, fiber.StatusOK, fiber.Map{"deleted": true})
}

// ---------- Admin: tags ----------

func (h *TaxonomyHandler) CreateTag(c *fiber.Ctx) error {
	var req dto.TagRequest
	if err := c.BodyParser(&req); err != nil {
		return fail(c, fiber.StatusBadRequest, "invalid request body")
	}
	if err := validator.Struct(req); err != nil {
		return fail(c, fiber.StatusUnprocessableEntity, err.Error())
	}
	tag, err := h.svc.CreateTag(c.Context(), req)
	if err != nil {
		return mapWriteError(c, err, "a tag with this slug already exists")
	}
	return ok(c, fiber.StatusCreated, dto.TagToDTO(*tag, nil))
}

func (h *TaxonomyHandler) UpdateTag(c *fiber.Ctx) error {
	id, ok2 := paramID(c)
	if !ok2 {
		return fail(c, fiber.StatusBadRequest, "invalid id")
	}
	var req dto.TagRequest
	if err := c.BodyParser(&req); err != nil {
		return fail(c, fiber.StatusBadRequest, "invalid request body")
	}
	if err := validator.Struct(req); err != nil {
		return fail(c, fiber.StatusUnprocessableEntity, err.Error())
	}
	tag, err := h.svc.UpdateTag(c.Context(), id, req)
	if err != nil {
		return mapWriteError(c, err, "a tag with this slug already exists")
	}
	return ok(c, fiber.StatusOK, dto.TagToDTO(*tag, nil))
}

func (h *TaxonomyHandler) DeleteTag(c *fiber.Ctx) error {
	id, ok2 := paramID(c)
	if !ok2 {
		return fail(c, fiber.StatusBadRequest, "invalid id")
	}
	deleted, err := h.svc.DeleteTag(c.Context(), id)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, "failed to delete tag")
	}
	if !deleted {
		return fail(c, fiber.StatusNotFound, "tag not found")
	}
	return ok(c, fiber.StatusOK, fiber.Map{"deleted": true})
}
