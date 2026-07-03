package service

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/rivael/blog-backend/internal/config"
	"github.com/rivael/blog-backend/internal/models"
	"github.com/rivael/blog-backend/internal/repository"
	"github.com/rivael/blog-backend/internal/token"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeAdminRepository is an in-memory repository.AdminRepository for unit
// testing AuthService without a database.
type fakeAdminRepository struct {
	mu     sync.Mutex
	nextID int64
	byID   map[int64]*models.AdminUser
	byMail map[string]int64
}

func newFakeAdminRepository() *fakeAdminRepository {
	return &fakeAdminRepository{
		byID:   make(map[int64]*models.AdminUser),
		byMail: make(map[string]int64),
	}
}

// seed inserts an admin directly (bypassing Upsert) and returns its ID.
func (f *fakeAdminRepository) seed(a *models.AdminUser) int64 {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.nextID++
	a.ID = f.nextID
	cp := *a
	f.byID[a.ID] = &cp
	f.byMail[a.Email] = a.ID
	return a.ID
}

func (f *fakeAdminRepository) FindByEmail(ctx context.Context, email string) (*models.AdminUser, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	id, ok := f.byMail[email]
	if !ok {
		return nil, repository.ErrNotFoundType{Entity: "admin"}
	}
	cp := *f.byID[id]
	return &cp, nil
}

func (f *fakeAdminRepository) FindByID(ctx context.Context, id int64) (*models.AdminUser, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	a, ok := f.byID[id]
	if !ok {
		return nil, repository.ErrNotFoundType{Entity: "admin"}
	}
	cp := *a
	return &cp, nil
}

func (f *fakeAdminRepository) Upsert(ctx context.Context, a *models.AdminUser) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if id, ok := f.byMail[a.Email]; ok {
		existing := f.byID[id]
		existing.PasswordHash = a.PasswordHash
		existing.DisplayName = a.DisplayName
		return nil
	}
	f.nextID++
	a.ID = f.nextID
	cp := *a
	f.byID[a.ID] = &cp
	f.byMail[a.Email] = a.ID
	return nil
}

func (f *fakeAdminRepository) UpdatePassword(ctx context.Context, id int64, passwordHash string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	a, ok := f.byID[id]
	if !ok {
		return repository.ErrNotFoundType{Entity: "admin"}
	}
	a.PasswordHash = passwordHash
	return nil
}

func (f *fakeAdminRepository) BumpTokenVersion(ctx context.Context, id int64) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	a, ok := f.byID[id]
	if !ok {
		return repository.ErrNotFoundType{Entity: "admin"}
	}
	a.TokenVersion++
	return nil
}

func (f *fakeAdminRepository) TouchLogin(ctx context.Context, id int64) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	a, ok := f.byID[id]
	if !ok {
		return repository.ErrNotFoundType{Entity: "admin"}
	}
	now := time.Now()
	a.LastLoginAt = &now
	return nil
}

var _ repository.AdminRepository = (*fakeAdminRepository)(nil)

func newTestAuthService(t *testing.T, repo *fakeAdminRepository) *AuthService {
	t.Helper()
	tm := token.NewManager("test-secret", 15*time.Minute, 168*time.Hour)
	cfg := &config.Config{AppEnv: "test"}
	return NewAuthService(repo, tm, cfg)
}

func TestAuthService_Login_Success(t *testing.T) {
	// Arrange
	repo := newFakeAdminRepository()
	hash, err := HashPassword("correct-horse-battery")
	require.NoError(t, err)
	id := repo.seed(&models.AdminUser{
		Email:        "admin@example.com",
		PasswordHash: hash,
		DisplayName:  "Admin",
	})
	svc := newTestAuthService(t, repo)

	// Act
	res, err := svc.Login(context.Background(), "admin@example.com", "correct-horse-battery")

	// Assert
	require.NoError(t, err)
	assert.NotEmpty(t, res.AccessToken)
	assert.NotEmpty(t, res.RefreshToken)
	assert.Equal(t, id, res.Admin.ID)
	assert.Equal(t, "admin@example.com", res.Admin.Email)
	assert.Equal(t, "Admin", res.Admin.DisplayName)
	assert.False(t, res.ExpiresAt.IsZero())

	admin, err := repo.FindByID(context.Background(), id)
	require.NoError(t, err)
	assert.NotNil(t, admin.LastLoginAt, "TouchLogin should have set LastLoginAt")
}

func TestAuthService_Login_WrongPassword(t *testing.T) {
	// Arrange
	repo := newFakeAdminRepository()
	hash, err := HashPassword("correct-horse-battery")
	require.NoError(t, err)
	repo.seed(&models.AdminUser{Email: "admin@example.com", PasswordHash: hash})
	svc := newTestAuthService(t, repo)

	// Act
	_, err = svc.Login(context.Background(), "admin@example.com", "wrong-password")

	// Assert
	assert.ErrorIs(t, err, ErrInvalidCredentials)
}

func TestAuthService_Login_UnknownEmail_DoesNotPanic(t *testing.T) {
	// Arrange
	repo := newFakeAdminRepository()
	svc := newTestAuthService(t, repo)

	// Act
	assert.NotPanics(t, func() {
		_, err := svc.Login(context.Background(), "nobody@example.com", "whatever-password")
		// Assert
		assert.ErrorIs(t, err, ErrInvalidCredentials)
	})
}

func TestAuthService_Refresh_Success(t *testing.T) {
	// Arrange
	repo := newFakeAdminRepository()
	hash, err := HashPassword("correct-horse-battery")
	require.NoError(t, err)
	repo.seed(&models.AdminUser{Email: "admin@example.com", PasswordHash: hash})
	svc := newTestAuthService(t, repo)

	loginRes, err := svc.Login(context.Background(), "admin@example.com", "correct-horse-battery")
	require.NoError(t, err)

	// Act
	refreshRes, err := svc.Refresh(context.Background(), loginRes.RefreshToken)

	// Assert
	require.NoError(t, err)
	assert.NotEmpty(t, refreshRes.AccessToken)
	assert.NotEmpty(t, refreshRes.RefreshToken)
}

func TestAuthService_Refresh_RevokedOnTokenVersionMismatch(t *testing.T) {
	// Arrange
	repo := newFakeAdminRepository()
	hash, err := HashPassword("correct-horse-battery")
	require.NoError(t, err)
	id := repo.seed(&models.AdminUser{Email: "admin@example.com", PasswordHash: hash})
	svc := newTestAuthService(t, repo)

	loginRes, err := svc.Login(context.Background(), "admin@example.com", "correct-horse-battery")
	require.NoError(t, err)

	// bump the admin's token version out from under the refresh token (e.g. a logout elsewhere)
	require.NoError(t, repo.BumpTokenVersion(context.Background(), id))

	// Act
	_, err = svc.Refresh(context.Background(), loginRes.RefreshToken)

	// Assert
	assert.ErrorIs(t, err, ErrTokenRejected)
}

func TestAuthService_Refresh_RejectsAccessTokenAsRefresh(t *testing.T) {
	// Arrange
	repo := newFakeAdminRepository()
	hash, err := HashPassword("correct-horse-battery")
	require.NoError(t, err)
	repo.seed(&models.AdminUser{Email: "admin@example.com", PasswordHash: hash})
	svc := newTestAuthService(t, repo)

	loginRes, err := svc.Login(context.Background(), "admin@example.com", "correct-horse-battery")
	require.NoError(t, err)

	// Act: try to refresh using the access token instead of the refresh token
	_, err = svc.Refresh(context.Background(), loginRes.AccessToken)

	// Assert
	assert.ErrorIs(t, err, ErrTokenRejected)
}

func TestAuthService_Logout_BumpsTokenVersion(t *testing.T) {
	// Arrange
	repo := newFakeAdminRepository()
	id := repo.seed(&models.AdminUser{Email: "admin@example.com", PasswordHash: dummyHash})
	svc := newTestAuthService(t, repo)

	before, err := repo.FindByID(context.Background(), id)
	require.NoError(t, err)

	// Act
	err = svc.Logout(context.Background(), id)
	require.NoError(t, err)

	// Assert
	after, err := repo.FindByID(context.Background(), id)
	require.NoError(t, err)
	assert.Equal(t, before.TokenVersion+1, after.TokenVersion)
}

func TestAuthService_ChangePassword_WrongCurrentPassword(t *testing.T) {
	// Arrange
	repo := newFakeAdminRepository()
	hash, err := HashPassword("correct-horse-battery")
	require.NoError(t, err)
	id := repo.seed(&models.AdminUser{Email: "admin@example.com", PasswordHash: hash})
	svc := newTestAuthService(t, repo)

	// Act
	err = svc.ChangePassword(context.Background(), id, "not-the-current-password", "new-password-123")

	// Assert
	assert.ErrorIs(t, err, ErrInvalidCredentials)

	admin, findErr := repo.FindByID(context.Background(), id)
	require.NoError(t, findErr)
	assert.True(t, VerifyPassword(admin.PasswordHash, "correct-horse-battery"), "password must not have changed")
}

func TestAuthService_ChangePassword_Success(t *testing.T) {
	// Arrange
	repo := newFakeAdminRepository()
	hash, err := HashPassword("correct-horse-battery")
	require.NoError(t, err)
	id := repo.seed(&models.AdminUser{Email: "admin@example.com", PasswordHash: hash})
	svc := newTestAuthService(t, repo)

	// Act
	err = svc.ChangePassword(context.Background(), id, "correct-horse-battery", "brand-new-password")

	// Assert
	require.NoError(t, err)
	admin, err := repo.FindByID(context.Background(), id)
	require.NoError(t, err)
	assert.True(t, VerifyPassword(admin.PasswordHash, "brand-new-password"))
	assert.Equal(t, 1, admin.TokenVersion, "changing password should revoke outstanding tokens")
}

func TestAuthService_ChangePassword_UnknownAdmin(t *testing.T) {
	// Arrange
	repo := newFakeAdminRepository()
	svc := newTestAuthService(t, repo)

	// Act
	err := svc.ChangePassword(context.Background(), 999, "whatever", "whatever2")

	// Assert
	require.Error(t, err)
	assert.True(t, repository.IsNotFound(err) || errors.Is(err, ErrInvalidCredentials))
}
