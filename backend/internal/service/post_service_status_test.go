package service

import (
	"context"
	"testing"
	"time"

	"github.com/rivael/blog-backend/internal/config"
	"github.com/rivael/blog-backend/internal/dto"
	"github.com/rivael/blog-backend/internal/models"
	"github.com/rivael/blog-backend/internal/repository"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakePostRepository is an in-memory repository.PostRepository sufficient to
// unit test PostService's Create/Update/SetStatus control flow.
type fakePostRepository struct {
	nextID int64
	posts  map[int64]*models.Post

	// lastCreateTagIDs / lastUpdateTagIDs capture the tagIDs handed to
	// CreateWithTags / UpdateWithTags so tests can assert on them.
	lastCreateTagIDs []int64
	lastUpdateTagIDs []int64
}

func newFakePostRepository() *fakePostRepository {
	return &fakePostRepository{posts: make(map[int64]*models.Post)}
}

func (f *fakePostRepository) Create(ctx context.Context, p *models.Post) error {
	f.nextID++
	p.ID = f.nextID
	f.posts[p.ID] = p
	return nil
}

func (f *fakePostRepository) Update(ctx context.Context, p *models.Post) error {
	f.posts[p.ID] = p
	return nil
}

func (f *fakePostRepository) CreateWithTags(ctx context.Context, p *models.Post, tagIDs []int64) error {
	f.lastCreateTagIDs = tagIDs
	return f.Create(ctx, p)
}

func (f *fakePostRepository) UpdateWithTags(ctx context.Context, p *models.Post, tagIDs []int64) error {
	f.lastUpdateTagIDs = tagIDs
	return f.Update(ctx, p)
}

func (f *fakePostRepository) Delete(ctx context.Context, id int64) (bool, error) {
	if _, ok := f.posts[id]; !ok {
		return false, nil
	}
	delete(f.posts, id)
	return true, nil
}

func (f *fakePostRepository) FindByID(ctx context.Context, id int64) (*models.Post, error) {
	p, ok := f.posts[id]
	if !ok {
		return nil, repository.ErrNotFoundType{Entity: "post"}
	}
	cp := *p
	return &cp, nil
}

func (f *fakePostRepository) FindBySlug(ctx context.Context, slug string, publishedOnly bool) (*models.Post, error) {
	for _, p := range f.posts {
		if p.Slug == slug {
			cp := *p
			return &cp, nil
		}
	}
	return nil, repository.ErrNotFoundType{Entity: "post"}
}

func (f *fakePostRepository) List(ctx context.Context, filter repository.PostFilter) ([]models.Post, int64, error) {
	return nil, 0, nil
}

func (f *fakePostRepository) Search(ctx context.Context, query string, page, limit int) ([]repository.SearchResult, int64, error) {
	return nil, 0, nil
}

func (f *fakePostRepository) SetTags(ctx context.Context, postID int64, tagIDs []int64) error {
	return nil
}

func (f *fakePostRepository) Stats(ctx context.Context) (repository.PostStats, error) {
	return repository.PostStats{}, nil
}

var _ repository.PostRepository = (*fakePostRepository)(nil)

// fakeTagRepository is an in-memory repository.TagRepository stub; ExistingIDs
// simply echoes back whatever ids were requested (all "exist").
type fakeTagRepository struct{}

func (fakeTagRepository) Create(ctx context.Context, t *models.Tag) error { return nil }
func (fakeTagRepository) Update(ctx context.Context, t *models.Tag) error { return nil }
func (fakeTagRepository) Delete(ctx context.Context, id int64) (bool, error) {
	return false, nil
}
func (fakeTagRepository) FindByID(ctx context.Context, id int64) (*models.Tag, error) {
	return nil, repository.ErrNotFoundType{Entity: "tag"}
}
func (fakeTagRepository) FindBySlug(ctx context.Context, slug string) (*models.Tag, error) {
	return nil, repository.ErrNotFoundType{Entity: "tag"}
}
func (fakeTagRepository) ListWithCounts(ctx context.Context) ([]models.Tag, map[int64]int64, error) {
	return nil, nil, nil
}
func (fakeTagRepository) ExistingIDs(ctx context.Context, ids []int64) ([]int64, error) {
	return ids, nil
}

var _ repository.TagRepository = fakeTagRepository{}

func newTestPostService() (*PostService, *fakePostRepository) {
	posts := newFakePostRepository()
	reval := NewRevalidator(&config.Config{}) // empty RevalidateURL => no-op Trigger
	return NewPostService(posts, fakeTagRepository{}, reval), posts
}

func TestPostService_Create_DefaultsSlugFromTitle(t *testing.T) {
	// Arrange
	svc, posts := newTestPostService()
	req := dto.CreatePostRequest{
		Title:   "My Great Post Title!",
		Content: "<p>hello</p>",
	}

	// Act
	saved, err := svc.Create(context.Background(), 1, req)

	// Assert
	require.NoError(t, err)
	assert.Equal(t, "my-great-post-title", saved.Slug)
	assert.Equal(t, "my-great-post-title", posts.posts[saved.ID].Slug)
}

func TestPostService_Create_RespectsExplicitSlug(t *testing.T) {
	// Arrange
	svc, _ := newTestPostService()
	req := dto.CreatePostRequest{
		Title:   "Some Title",
		Slug:    "custom-slug",
		Content: "hello",
	}

	// Act
	saved, err := svc.Create(context.Background(), 1, req)

	// Assert
	require.NoError(t, err)
	assert.Equal(t, "custom-slug", saved.Slug)
}

func TestPostService_Create_SanitizesScriptTagsFromHTMLContent(t *testing.T) {
	// Arrange
	svc, posts := newTestPostService()
	req := dto.CreatePostRequest{
		Title:         "XSS Test",
		Content:       `<p>safe</p><script>alert('xss')</script>`,
		ContentFormat: "html",
	}

	// Act
	saved, err := svc.Create(context.Background(), 1, req)

	// Assert
	require.NoError(t, err)
	assert.NotContains(t, saved.Content, "<script>")
	assert.NotContains(t, saved.Content, "alert('xss')")
	assert.Contains(t, saved.Content, "safe")
	assert.NotContains(t, posts.posts[saved.ID].Content, "<script>")
}

func TestPostService_Create_ComputesReadingTime(t *testing.T) {
	// Arrange
	svc, _ := newTestPostService()
	words := make([]byte, 0)
	for i := 0; i < 400; i++ { // 400 words @ 200 wpm => 2 minutes
		words = append(words, []byte("word ")...)
	}
	req := dto.CreatePostRequest{
		Title:   "Reading Time Test",
		Content: string(words),
	}

	// Act
	saved, err := svc.Create(context.Background(), 1, req)

	// Assert
	require.NoError(t, err)
	assert.Equal(t, 2, saved.ReadingTimeMin)
}

func TestPostService_Create_ShortContent_ReadingTimeFloorsAtOne(t *testing.T) {
	// Arrange
	svc, _ := newTestPostService()
	req := dto.CreatePostRequest{Title: "Tiny", Content: "one two three"}

	// Act
	saved, err := svc.Create(context.Background(), 1, req)

	// Assert
	require.NoError(t, err)
	assert.Equal(t, 1, saved.ReadingTimeMin)
}

func TestPostService_Create_DefaultsStatusToDraft(t *testing.T) {
	// Arrange
	svc, _ := newTestPostService()
	req := dto.CreatePostRequest{Title: "No Status Given", Content: "hello"}

	// Act
	saved, err := svc.Create(context.Background(), 1, req)

	// Assert
	require.NoError(t, err)
	assert.Equal(t, models.StatusDraft, saved.Status)
	assert.Nil(t, saved.PublishedAt)
}

func TestPostService_Create_PublishedWithoutExplicitDate_SetsPublishedAtNow(t *testing.T) {
	// Arrange
	svc, _ := newTestPostService()
	req := dto.CreatePostRequest{
		Title:   "Publish Me",
		Content: "hello",
		Status:  string(models.StatusPublished),
	}
	before := time.Now()

	// Act
	saved, err := svc.Create(context.Background(), 1, req)
	after := time.Now()

	// Assert
	require.NoError(t, err)
	require.NotNil(t, saved.PublishedAt)
	assert.True(t, !saved.PublishedAt.Before(before) && !saved.PublishedAt.After(after))
}

func TestPostService_Create_PublishedWithExplicitDate_KeepsIt(t *testing.T) {
	// Arrange
	svc, _ := newTestPostService()
	explicit := time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)
	req := dto.CreatePostRequest{
		Title:       "Backdated",
		Content:     "hello",
		Status:      string(models.StatusPublished),
		PublishedAt: &explicit,
	}

	// Act
	saved, err := svc.Create(context.Background(), 1, req)

	// Assert
	require.NoError(t, err)
	require.NotNil(t, saved.PublishedAt)
	assert.True(t, explicit.Equal(*saved.PublishedAt))
}

func TestPostService_SetStatus_PublishingWithNilPublishedAt_SetsItNow(t *testing.T) {
	// Arrange
	svc, posts := newTestPostService()
	created, err := svc.Create(context.Background(), 1, dto.CreatePostRequest{
		Title:   "Draft Post",
		Content: "hello",
		Status:  string(models.StatusDraft),
	})
	require.NoError(t, err)
	require.Nil(t, created.PublishedAt)
	before := time.Now()

	// Act
	saved, err := svc.SetStatus(context.Background(), created.ID, models.StatusPublished, nil)
	after := time.Now()

	// Assert
	require.NoError(t, err)
	assert.Equal(t, models.StatusPublished, saved.Status)
	require.NotNil(t, saved.PublishedAt)
	assert.True(t, !saved.PublishedAt.Before(before) && !saved.PublishedAt.After(after))
	assert.Equal(t, models.StatusPublished, posts.posts[created.ID].Status)
}

func TestPostService_SetStatus_UnpublishingKeepsExistingPublishedAt(t *testing.T) {
	// Arrange
	svc, _ := newTestPostService()
	explicit := time.Date(2021, 6, 1, 0, 0, 0, 0, time.UTC)
	created, err := svc.Create(context.Background(), 1, dto.CreatePostRequest{
		Title:       "Published Post",
		Content:     "hello",
		Status:      string(models.StatusPublished),
		PublishedAt: &explicit,
	})
	require.NoError(t, err)

	// Act: revert to draft without specifying a new publishedAt
	saved, err := svc.SetStatus(context.Background(), created.ID, models.StatusDraft, nil)

	// Assert
	require.NoError(t, err)
	assert.Equal(t, models.StatusDraft, saved.Status)
	require.NotNil(t, saved.PublishedAt)
	assert.True(t, explicit.Equal(*saved.PublishedAt))
}
