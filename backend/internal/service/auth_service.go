package service

import (
	"context"
	"errors"
	"time"

	"github.com/rivael/blog-backend/internal/config"
	"github.com/rivael/blog-backend/internal/dto"
	"github.com/rivael/blog-backend/internal/repository"
	"github.com/rivael/blog-backend/internal/token"
)

var (
	// ErrInvalidCredentials is returned when the email/password pair does not
	// match a known admin.
	ErrInvalidCredentials = errors.New("invalid credentials")
	// ErrTokenRejected is returned when a refresh token's embedded token
	// version no longer matches the admin's current token version.
	ErrTokenRejected = errors.New("token rejected")
)

// dummyHash is a fixed, valid argon2id hash used to run VerifyPassword even
// when no admin is found, so login timing does not leak account existence.
const dummyHash = "$argon2id$v=19$m=65536,t=3,p=2$MDAwMDAwMDAwMDAwMDAwMA$MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA"

// AuthService implements admin authentication: login, token refresh, logout,
// profile lookup, and password changes.
type AuthService struct {
	admins repository.AdminRepository
	tokens *token.Manager
	cfg    *config.Config
}

// NewAuthService constructs an AuthService.
func NewAuthService(admins repository.AdminRepository, tokens *token.Manager, cfg *config.Config) *AuthService {
	return &AuthService{admins: admins, tokens: tokens, cfg: cfg}
}

// Login verifies email/password and, on success, issues a fresh access +
// refresh token pair. It always runs VerifyPassword (against a dummy hash
// when the admin does not exist) to avoid timing-based user enumeration.
func (s *AuthService) Login(ctx context.Context, email, password string) (dto.LoginResponse, error) {
	admin, err := s.admins.FindByEmail(ctx, email)
	if err != nil && !repository.IsNotFound(err) {
		return dto.LoginResponse{}, err
	}

	hash := dummyHash
	if admin != nil {
		hash = admin.PasswordHash
	}

	valid := VerifyPassword(hash, password)
	if admin == nil || !valid {
		return dto.LoginResponse{}, ErrInvalidCredentials
	}

	if err := s.admins.TouchLogin(ctx, admin.ID); err != nil {
		return dto.LoginResponse{}, err
	}

	now := time.Now()
	access, expiresAt, err := s.tokens.Issue(token.Access, admin.ID, admin.TokenVersion, now)
	if err != nil {
		return dto.LoginResponse{}, err
	}
	refresh, _, err := s.tokens.Issue(token.Refresh, admin.ID, admin.TokenVersion, now)
	if err != nil {
		return dto.LoginResponse{}, err
	}

	return dto.LoginResponse{
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresAt:    expiresAt,
		Admin: dto.AdminDTO{
			ID:          admin.ID,
			Email:       admin.Email,
			DisplayName: admin.DisplayName,
		},
	}, nil
}

// Refresh validates a refresh token and, if its token version still matches
// the admin's current version, issues a new access + refresh pair.
func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (dto.TokenResponse, error) {
	claims, err := s.tokens.Parse(refreshToken, token.Refresh)
	if err != nil {
		return dto.TokenResponse{}, ErrTokenRejected
	}

	admin, err := s.admins.FindByID(ctx, claims.AdminID)
	if err != nil {
		if repository.IsNotFound(err) {
			return dto.TokenResponse{}, ErrTokenRejected
		}
		return dto.TokenResponse{}, err
	}

	if claims.TokenVersion != admin.TokenVersion {
		return dto.TokenResponse{}, ErrTokenRejected
	}

	now := time.Now()
	access, expiresAt, err := s.tokens.Issue(token.Access, admin.ID, admin.TokenVersion, now)
	if err != nil {
		return dto.TokenResponse{}, err
	}
	refresh, _, err := s.tokens.Issue(token.Refresh, admin.ID, admin.TokenVersion, now)
	if err != nil {
		return dto.TokenResponse{}, err
	}

	return dto.TokenResponse{
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresAt:    expiresAt,
	}, nil
}

// Logout revokes all outstanding tokens for the admin by bumping their token
// version.
func (s *AuthService) Logout(ctx context.Context, adminID int64) error {
	return s.admins.BumpTokenVersion(ctx, adminID)
}

// Me returns the admin's public profile.
func (s *AuthService) Me(ctx context.Context, adminID int64) (dto.AdminDTO, error) {
	admin, err := s.admins.FindByID(ctx, adminID)
	if err != nil {
		return dto.AdminDTO{}, err
	}
	return dto.AdminDTO{
		ID:          admin.ID,
		Email:       admin.Email,
		DisplayName: admin.DisplayName,
	}, nil
}

// ChangePassword verifies the current password, sets a new one, and revokes
// all outstanding tokens by bumping the admin's token version.
func (s *AuthService) ChangePassword(ctx context.Context, adminID int64, current, next string) error {
	admin, err := s.admins.FindByID(ctx, adminID)
	if err != nil {
		return err
	}

	if !VerifyPassword(admin.PasswordHash, current) {
		return ErrInvalidCredentials
	}

	newHash, err := HashPassword(next)
	if err != nil {
		return err
	}

	if err := s.admins.UpdatePassword(ctx, adminID, newHash); err != nil {
		return err
	}

	return s.admins.BumpTokenVersion(ctx, adminID)
}
