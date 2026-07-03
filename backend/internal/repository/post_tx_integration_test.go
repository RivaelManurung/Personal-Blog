//go:build integration

package repository

import (
	"context"
	"testing"

	"github.com/rivael/blog-backend/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestPostRepositoryTx_CreateWithTags_PersistsPostAndAssociationsAtomically
// verifies that CreateWithTags persists the post row and its tag
// associations together, and that FindByID reloads both.
func TestPostRepositoryTx_CreateWithTags_PersistsPostAndAssociationsAtomically(t *testing.T) {
	// Arrange
	db := testDB(t)
	ctx := context.Background()
	postRepo := NewPostRepository(db)
	tagRepo := NewTagRepository(db)
	authorID := seedAdmin(t, db)

	goTag := &models.Tag{Name: "Go", Slug: "go"}
	webTag := &models.Tag{Name: "Web", Slug: "web"}
	require.NoError(t, tagRepo.Create(ctx, goTag))
	require.NoError(t, tagRepo.Create(ctx, webTag))

	post := makePost(authorID, withSlug("tagged-post"), withTitle("Tagged Post"))

	// Act
	err := postRepo.CreateWithTags(ctx, post, []int64{goTag.ID, webTag.ID})
	require.NoError(t, err)

	reloaded, err := postRepo.FindByID(ctx, post.ID)

	// Assert
	require.NoError(t, err)
	require.Len(t, reloaded.Tags, 2)
	gotSlugs := []string{reloaded.Tags[0].Slug, reloaded.Tags[1].Slug}
	assert.ElementsMatch(t, []string{"go", "web"}, gotSlugs)
}

// TestPostRepositoryTx_UpdateWithTags_ReplacesAssociations verifies that
// UpdateWithTags fully replaces the previous tag set rather than merging
// with it.
func TestPostRepositoryTx_UpdateWithTags_ReplacesAssociations(t *testing.T) {
	// Arrange
	db := testDB(t)
	ctx := context.Background()
	postRepo := NewPostRepository(db)
	tagRepo := NewTagRepository(db)
	authorID := seedAdmin(t, db)

	goTag := &models.Tag{Name: "Go", Slug: "go"}
	webTag := &models.Tag{Name: "Web", Slug: "web"}
	rustTag := &models.Tag{Name: "Rust", Slug: "rust"}
	require.NoError(t, tagRepo.Create(ctx, goTag))
	require.NoError(t, tagRepo.Create(ctx, webTag))
	require.NoError(t, tagRepo.Create(ctx, rustTag))

	post := makePost(authorID, withSlug("retagged-post"), withTitle("Retagged Post"))
	require.NoError(t, postRepo.CreateWithTags(ctx, post, []int64{goTag.ID, webTag.ID}))

	// Act: replace [go, web] with [rust] only
	err := postRepo.UpdateWithTags(ctx, post, []int64{rustTag.ID})
	require.NoError(t, err)

	reloaded, err := postRepo.FindByID(ctx, post.ID)

	// Assert
	require.NoError(t, err)
	require.Len(t, reloaded.Tags, 1)
	assert.Equal(t, "rust", reloaded.Tags[0].Slug)
}

// TestPostRepositoryTx_UpdateWithTags_EmptyTagIDsClearsAssociations verifies
// that passing an empty tagIDs slice clears all associations.
func TestPostRepositoryTx_UpdateWithTags_EmptyTagIDsClearsAssociations(t *testing.T) {
	// Arrange
	db := testDB(t)
	ctx := context.Background()
	postRepo := NewPostRepository(db)
	tagRepo := NewTagRepository(db)
	authorID := seedAdmin(t, db)

	goTag := &models.Tag{Name: "Go", Slug: "go"}
	require.NoError(t, tagRepo.Create(ctx, goTag))

	post := makePost(authorID, withSlug("cleared-post"), withTitle("Cleared Post"))
	require.NoError(t, postRepo.CreateWithTags(ctx, post, []int64{goTag.ID}))

	// Act
	err := postRepo.UpdateWithTags(ctx, post, []int64{})
	require.NoError(t, err)

	reloaded, err := postRepo.FindByID(ctx, post.ID)

	// Assert
	require.NoError(t, err)
	assert.Empty(t, reloaded.Tags)
}
