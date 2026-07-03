package middleware

import (
	"context"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rivael/blog-backend/internal/models"
	"github.com/rivael/blog-backend/internal/repository"
	"github.com/rivael/blog-backend/internal/token"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeAdminRepository is a minimal in-memory repository.AdminRepository for
// exercising RequireAuth without a database.
type fakeAdminRepository struct {
	admins map[int64]*models.AdminUser
}

func newFakeAdminRepository(admins ...*models.AdminUser) *fakeAdminRepository {
	f := &fakeAdminRepository{admins: make(map[int64]*models.AdminUser)}
	for _, a := range admins {
		f.admins[a.ID] = a
	}
	return f
}

func (f *fakeAdminRepository) FindByEmail(ctx context.Context, email string) (*models.AdminUser, error) {
	for _, a := range f.admins {
		if a.Email == email {
			return a, nil
		}
	}
	return nil, repository.ErrNotFoundType{Entity: "admin"}
}

func (f *fakeAdminRepository) FindByID(ctx context.Context, id int64) (*models.AdminUser, error) {
	a, ok := f.admins[id]
	if !ok {
		return nil, repository.ErrNotFoundType{Entity: "admin"}
	}
	return a, nil
}

func (f *fakeAdminRepository) Upsert(ctx context.Context, a *models.AdminUser) error {
	f.admins[a.ID] = a
	return nil
}

func (f *fakeAdminRepository) UpdatePassword(ctx context.Context, id int64, passwordHash string) error {
	if a, ok := f.admins[id]; ok {
		a.PasswordHash = passwordHash
	}
	return nil
}

func (f *fakeAdminRepository) BumpTokenVersion(ctx context.Context, id int64) error {
	if a, ok := f.admins[id]; ok {
		a.TokenVersion++
	}
	return nil
}

func (f *fakeAdminRepository) TouchLogin(ctx context.Context, id int64) error { return nil }

var _ repository.AdminRepository = (*fakeAdminRepository)(nil)

// buildTestApp wires a tiny Fiber app with a single protected route guarded
// by RequireAuth, returning 200 with the authenticated admin id on success.
func buildTestApp(tokens *token.Manager, admins repository.AdminRepository) *fiber.App {
	app := fiber.New()
	app.Get("/protected", RequireAuth(tokens, admins), func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{"adminID": AdminIDFrom(c)})
	})
	return app
}

func TestRequireAuth_NoAuthorizationHeader(t *testing.T) {
	// Arrange
	tokens := token.NewManager("secret", 15*time.Minute, 168*time.Hour)
	admins := newFakeAdminRepository()
	app := buildTestApp(tokens, admins)

	// Act
	req := httptest.NewRequest("GET", "/protected", nil)
	resp, err := app.Test(req)

	// Assert
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}

func TestRequireAuth_MalformedBearer(t *testing.T) {
	// Arrange
	tokens := token.NewManager("secret", 15*time.Minute, 168*time.Hour)
	admins := newFakeAdminRepository()
	app := buildTestApp(tokens, admins)

	// Act
	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "not-a-bearer-token")
	resp, err := app.Test(req)

	// Assert
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}

func TestRequireAuth_ValidAccessToken(t *testing.T) {
	// Arrange
	tokens := token.NewManager("secret", 15*time.Minute, 168*time.Hour)
	admin := &models.AdminUser{ID: 42, Email: "admin@example.com", TokenVersion: 0}
	admins := newFakeAdminRepository(admin)
	app := buildTestApp(tokens, admins)

	access, _, err := tokens.Issue(token.Access, admin.ID, admin.TokenVersion, time.Now())
	require.NoError(t, err)

	// Act
	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+access)
	resp, err := app.Test(req)

	// Assert
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
}

func TestRequireAuth_RevokedTokenVersion(t *testing.T) {
	// Arrange
	tokens := token.NewManager("secret", 15*time.Minute, 168*time.Hour)
	admin := &models.AdminUser{ID: 42, Email: "admin@example.com", TokenVersion: 5}
	admins := newFakeAdminRepository(admin)
	app := buildTestApp(tokens, admins)

	// token minted with an old token version (tv=0) while the admin is now at tv=5
	access, _, err := tokens.Issue(token.Access, admin.ID, 0, time.Now())
	require.NoError(t, err)

	// Act
	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+access)
	resp, err := app.Test(req)

	// Assert
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}

func TestRequireAuth_UnknownAdmin(t *testing.T) {
	// Arrange
	tokens := token.NewManager("secret", 15*time.Minute, 168*time.Hour)
	admins := newFakeAdminRepository() // empty
	app := buildTestApp(tokens, admins)

	access, _, err := tokens.Issue(token.Access, 999, 0, time.Now())
	require.NoError(t, err)

	// Act
	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+access)
	resp, err := app.Test(req)

	// Assert
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}
