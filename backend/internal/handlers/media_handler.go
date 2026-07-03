package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/rivael/blog-backend/internal/dto"
	"github.com/rivael/blog-backend/internal/repository"
	"github.com/rivael/blog-backend/internal/service"
)

// MediaHandler serves media reads (public) and uploads/deletes (admin).
type MediaHandler struct {
	repo repository.MediaRepository
	svc  *service.MediaService
}

func NewMediaHandler(repo repository.MediaRepository, svc *service.MediaService) *MediaHandler {
	return &MediaHandler{repo: repo, svc: svc}
}

func (h *MediaHandler) GetByID(c *fiber.Ctx) error {
	id, ok2 := paramID(c)
	if !ok2 {
		return fail(c, fiber.StatusBadRequest, "invalid id")
	}
	m, err := h.repo.FindByID(c.Context(), id)
	if err != nil {
		if repository.IsNotFound(err) {
			return fail(c, fiber.StatusNotFound, "media not found")
		}
		return fail(c, fiber.StatusInternalServerError, "failed to fetch media")
	}
	return ok(c, fiber.StatusOK, dto.MediaToDTO(m))
}

func (h *MediaHandler) List(c *fiber.Ctx) error {
	page, limit := pagination(c)
	items, total, err := h.repo.List(c.Context(), page, limit)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, "failed to fetch media")
	}
	out := make([]*dto.MediaDTO, 0, len(items))
	for i := range items {
		out = append(out, dto.MediaToDTO(&items[i]))
	}
	return okPaginated(c, out, Meta{Page: page, Limit: limit, Total: total, TotalPages: totalPages(total, limit)})
}

func (h *MediaHandler) Upload(c *fiber.Ctx) error {
	fh, err := c.FormFile("file")
	if err != nil {
		return fail(c, fiber.StatusBadRequest, "a file is required")
	}
	m, err := h.svc.Save(c.Context(), fh, c.FormValue("altText"))
	if err != nil {
		switch {
		case errors.Is(err, service.ErrFileTooLarge):
			return fail(c, fiber.StatusRequestEntityTooLarge, "file too large")
		case errors.Is(err, service.ErrUnsupportedType):
			return fail(c, fiber.StatusUnsupportedMediaType, "unsupported file type")
		default:
			return fail(c, fiber.StatusInternalServerError, "failed to store file")
		}
	}
	return ok(c, fiber.StatusCreated, dto.MediaToDTO(m))
}

func (h *MediaHandler) Delete(c *fiber.Ctx) error {
	id, ok2 := paramID(c)
	if !ok2 {
		return fail(c, fiber.StatusBadRequest, "invalid id")
	}
	deleted, err := h.svc.Delete(c.Context(), id)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, "failed to delete media")
	}
	if !deleted {
		return fail(c, fiber.StatusNotFound, "media not found")
	}
	return ok(c, fiber.StatusOK, fiber.Map{"deleted": true})
}
