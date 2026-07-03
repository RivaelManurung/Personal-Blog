//go:build integration

package repository

import (
	"context"
	"testing"

	"github.com/rivael/blog-backend/internal/models"
	"github.com/stretchr/testify/require"
)

func TestMediaRepository_List(t *testing.T) {
	// Arrange
	db := testDB(t)
	ctx := context.Background()
	repo := NewMediaRepository(db)

	// Insert 3 media rows in ascending order; created_at is set by the DB, so
	// later inserts sort first under "created_at desc".
	first := &models.Media{Filename: "first.png", MimeType: "image/png", SizeBytes: 10, URL: "/uploads/first.png"}
	second := &models.Media{Filename: "second.png", MimeType: "image/png", SizeBytes: 20, URL: "/uploads/second.png"}
	third := &models.Media{Filename: "third.png", MimeType: "image/png", SizeBytes: 30, URL: "/uploads/third.png"}
	require.NoError(t, repo.Create(ctx, first))
	require.NoError(t, repo.Create(ctx, second))
	require.NoError(t, repo.Create(ctx, third))

	// Act: full page.
	items, total, err := repo.List(ctx, 1, 10)

	// Assert: total + newest-first ordering.
	require.NoError(t, err)
	require.EqualValues(t, 3, total)
	require.Len(t, items, 3)
	require.Equal(t, third.ID, items[0].ID, "expected newest media first")
	require.Equal(t, second.ID, items[1].ID)
	require.Equal(t, first.ID, items[2].ID)

	// Act: pagination — page 2 with limit 2 yields the single remaining row.
	pageOne, total1, err := repo.List(ctx, 1, 2)
	require.NoError(t, err)
	require.EqualValues(t, 3, total1)
	require.Len(t, pageOne, 2)

	pageTwo, total2, err := repo.List(ctx, 2, 2)
	require.NoError(t, err)
	require.EqualValues(t, 3, total2)
	require.Len(t, pageTwo, 1)
	require.Equal(t, first.ID, pageTwo[0].ID, "oldest media lands on the last page")
}
