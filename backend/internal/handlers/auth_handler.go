package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/rivael/blog-backend/internal/dto"
	"github.com/rivael/blog-backend/internal/middleware"
	"github.com/rivael/blog-backend/internal/service"
	"github.com/rivael/blog-backend/internal/validator"
)

// AuthHandler serves the admin authentication endpoints.
type AuthHandler struct {
	auth *service.AuthService
}

func NewAuthHandler(auth *service.AuthService) *AuthHandler {
	return &AuthHandler{auth: auth}
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req dto.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return fail(c, fiber.StatusBadRequest, "invalid request body")
	}
	if err := validator.Struct(req); err != nil {
		return fail(c, fiber.StatusUnprocessableEntity, err.Error())
	}

	res, err := h.auth.Login(c.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			return fail(c, fiber.StatusUnauthorized, "invalid email or password")
		}
		return fail(c, fiber.StatusInternalServerError, "internal error")
	}
	return ok(c, fiber.StatusOK, res)
}

func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	var req dto.RefreshRequest
	if err := c.BodyParser(&req); err != nil {
		return fail(c, fiber.StatusBadRequest, "invalid request body")
	}
	if err := validator.Struct(req); err != nil {
		return fail(c, fiber.StatusUnprocessableEntity, err.Error())
	}

	res, err := h.auth.Refresh(c.Context(), req.RefreshToken)
	if err != nil {
		return fail(c, fiber.StatusUnauthorized, "invalid refresh token")
	}
	return ok(c, fiber.StatusOK, res)
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	if err := h.auth.Logout(c.Context(), middleware.AdminIDFrom(c)); err != nil {
		return fail(c, fiber.StatusInternalServerError, "internal error")
	}
	return ok(c, fiber.StatusOK, fiber.Map{"loggedOut": true})
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	admin, err := h.auth.Me(c.Context(), middleware.AdminIDFrom(c))
	if err != nil {
		return fail(c, fiber.StatusUnauthorized, "unauthorized")
	}
	return ok(c, fiber.StatusOK, admin)
}

func (h *AuthHandler) ChangePassword(c *fiber.Ctx) error {
	var req dto.ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return fail(c, fiber.StatusBadRequest, "invalid request body")
	}
	if err := validator.Struct(req); err != nil {
		return fail(c, fiber.StatusUnprocessableEntity, err.Error())
	}

	if err := h.auth.ChangePassword(c.Context(), middleware.AdminIDFrom(c), req.CurrentPassword, req.NewPassword); err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			return fail(c, fiber.StatusUnauthorized, "current password is incorrect")
		}
		return fail(c, fiber.StatusInternalServerError, "internal error")
	}
	return ok(c, fiber.StatusOK, fiber.Map{"changed": true})
}
