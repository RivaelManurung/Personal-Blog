package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/rivael/blog-backend/internal/dto"
	"github.com/rivael/blog-backend/internal/middleware"
	"github.com/rivael/blog-backend/internal/models"
	"github.com/rivael/blog-backend/internal/repository"
	"github.com/rivael/blog-backend/internal/service"
	"github.com/rivael/blog-backend/internal/validator"
)

// maxSearchQueryLen caps the search query length to prevent pathological FTS input.
const maxSearchQueryLen = 200

// PostHandler serves public post reads and admin post writes.
type PostHandler struct {
	posts repository.PostRepository
	svc   *service.PostService
}

func NewPostHandler(posts repository.PostRepository, svc *service.PostService) *PostHandler {
	return &PostHandler{posts: posts, svc: svc}
}

// ---------- Public ----------

func (h *PostHandler) List(c *fiber.Ctx) error {
	page, limit := pagination(c)
	items, total, err := h.posts.List(c.Context(), repository.PostFilter{
		CategorySlug:  c.Query("category"),
		TagSlug:       c.Query("tag"),
		PublishedOnly: true,
		Page:          page,
		Limit:         limit,
		Sort:          c.Query("sort"),
	})
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, "failed to fetch posts")
	}
	out := make([]dto.PostSummaryDTO, 0, len(items))
	for i := range items {
		out = append(out, dto.PostToSummary(&items[i]))
	}
	return okPaginated(c, out, Meta{Page: page, Limit: limit, Total: total, TotalPages: totalPages(total, limit)})
}

func (h *PostHandler) GetBySlug(c *fiber.Ctx) error {
	post, err := h.posts.FindBySlug(c.Context(), c.Params("slug"), true)
	if err != nil {
		if repository.IsNotFound(err) {
			return fail(c, fiber.StatusNotFound, "post not found")
		}
		return fail(c, fiber.StatusInternalServerError, "failed to fetch post")
	}
	return ok(c, fiber.StatusOK, dto.PostToDetail(post))
}

func (h *PostHandler) Search(c *fiber.Ctx) error {
	q := strings.TrimSpace(c.Query("q"))
	page, limit := pagination(c)
	if q == "" {
		return okPaginated(c, []dto.SearchHitDTO{}, Meta{Page: page, Limit: limit, Total: 0, TotalPages: 0})
	}
	if len(q) > maxSearchQueryLen {
		q = q[:maxSearchQueryLen]
	}
	hits, total, err := h.posts.Search(c.Context(), q, page, limit)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, "search failed")
	}
	out := make([]dto.SearchHitDTO, 0, len(hits))
	for _, hit := range hits {
		out = append(out, dto.SearchHitDTO{
			ID:      hit.Post.ID,
			Title:   hit.Post.Title,
			Slug:    hit.Post.Slug,
			Excerpt: hit.Post.Excerpt,
			Snippet: hit.Snippet,
			Rank:    hit.Rank,
		})
	}
	return okPaginated(c, out, Meta{Page: page, Limit: limit, Total: total, TotalPages: totalPages(total, limit)})
}

// ---------- Admin ----------

func (h *PostHandler) AdminList(c *fiber.Ctx) error {
	page, limit := pagination(c)
	f := repository.PostFilter{
		Query: c.Query("q"),
		Page:  page,
		Limit: limit,
		Sort:  c.Query("sort"),
	}
	if s := c.Query("status"); s != "" {
		status := models.PostStatus(s)
		f.Status = &status
	}
	items, total, err := h.posts.List(c.Context(), f)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, "failed to fetch posts")
	}
	out := make([]dto.PostAdminSummaryDTO, 0, len(items))
	for i := range items {
		out = append(out, dto.PostToAdminSummary(&items[i]))
	}
	return okPaginated(c, out, Meta{Page: page, Limit: limit, Total: total, TotalPages: totalPages(total, limit)})
}

func (h *PostHandler) AdminGet(c *fiber.Ctx) error {
	id, ok2 := paramID(c)
	if !ok2 {
		return fail(c, fiber.StatusBadRequest, "invalid id")
	}
	post, err := h.posts.FindByID(c.Context(), id)
	if err != nil {
		if repository.IsNotFound(err) {
			return fail(c, fiber.StatusNotFound, "post not found")
		}
		return fail(c, fiber.StatusInternalServerError, "failed to fetch post")
	}
	return ok(c, fiber.StatusOK, dto.PostToDetail(post))
}

func (h *PostHandler) Create(c *fiber.Ctx) error {
	var req dto.CreatePostRequest
	if err := c.BodyParser(&req); err != nil {
		return fail(c, fiber.StatusBadRequest, "invalid request body")
	}
	if err := validator.Struct(req); err != nil {
		return fail(c, fiber.StatusUnprocessableEntity, err.Error())
	}
	post, err := h.svc.Create(c.Context(), middleware.AdminIDFrom(c), req)
	if err != nil {
		return mapWriteError(c, err, "a post with this slug already exists")
	}
	return ok(c, fiber.StatusCreated, dto.PostToDetail(post))
}

func (h *PostHandler) Update(c *fiber.Ctx) error {
	id, ok2 := paramID(c)
	if !ok2 {
		return fail(c, fiber.StatusBadRequest, "invalid id")
	}
	var req dto.UpdatePostRequest
	if err := c.BodyParser(&req); err != nil {
		return fail(c, fiber.StatusBadRequest, "invalid request body")
	}
	if err := validator.Struct(req); err != nil {
		return fail(c, fiber.StatusUnprocessableEntity, err.Error())
	}
	post, err := h.svc.Update(c.Context(), id, req)
	if err != nil {
		return mapWriteError(c, err, "a post with this slug already exists")
	}
	return ok(c, fiber.StatusOK, dto.PostToDetail(post))
}

func (h *PostHandler) UpdateStatus(c *fiber.Ctx) error {
	id, ok2 := paramID(c)
	if !ok2 {
		return fail(c, fiber.StatusBadRequest, "invalid id")
	}
	var req dto.UpdateStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return fail(c, fiber.StatusBadRequest, "invalid request body")
	}
	if err := validator.Struct(req); err != nil {
		return fail(c, fiber.StatusUnprocessableEntity, err.Error())
	}
	post, err := h.svc.SetStatus(c.Context(), id, models.PostStatus(req.Status), req.PublishedAt)
	if err != nil {
		return mapWriteError(c, err, "conflict")
	}
	return ok(c, fiber.StatusOK, dto.PostToDetail(post))
}

func (h *PostHandler) Delete(c *fiber.Ctx) error {
	id, ok2 := paramID(c)
	if !ok2 {
		return fail(c, fiber.StatusBadRequest, "invalid id")
	}
	deleted, err := h.svc.Delete(c.Context(), id)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, "failed to delete post")
	}
	if !deleted {
		return fail(c, fiber.StatusNotFound, "post not found")
	}
	return ok(c, fiber.StatusOK, fiber.Map{"deleted": true})
}

func (h *PostHandler) Stats(c *fiber.Ctx) error {
	stats, err := h.posts.Stats(c.Context())
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, "failed to fetch stats")
	}
	return ok(c, fiber.StatusOK, dto.StatsDTO{
		Total:     stats.Total,
		Published: stats.Published,
		Drafts:    stats.Drafts,
		Scheduled: stats.Scheduled,
	})
}
