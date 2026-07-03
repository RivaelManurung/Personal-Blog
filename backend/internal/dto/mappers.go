package dto

import "github.com/rivael/blog-backend/internal/models"

// MediaToDTO maps a media model to its API shape (nil-safe).
func MediaToDTO(m *models.Media) *MediaDTO {
	if m == nil {
		return nil
	}
	return &MediaDTO{
		ID:          m.ID,
		URL:         m.URL,
		Width:       m.Width,
		Height:      m.Height,
		BlurDataURL: m.BlurDataURL,
		AltText:     m.AltText,
	}
}

// CategoryToDTO maps a category; pass count=nil to omit postCount.
func CategoryToDTO(c *models.Category, count *int64) *CategoryDTO {
	if c == nil {
		return nil
	}
	return &CategoryDTO{
		ID:          c.ID,
		Name:        c.Name,
		Slug:        c.Slug,
		Description: c.Description,
		PostCount:   count,
	}
}

// TagToDTO maps a tag; pass count=nil to omit postCount.
func TagToDTO(t models.Tag, count *int64) TagDTO {
	return TagDTO{ID: t.ID, Name: t.Name, Slug: t.Slug, PostCount: count}
}

func tagsToDTO(tags []models.Tag) []TagDTO {
	out := make([]TagDTO, 0, len(tags))
	for i := range tags {
		out = append(out, TagToDTO(tags[i], nil))
	}
	return out
}

// PostToSummary maps a post to the public list shape.
func PostToSummary(p *models.Post) PostSummaryDTO {
	return PostSummaryDTO{
		ID:             p.ID,
		Title:          p.Title,
		Slug:           p.Slug,
		Excerpt:        p.Excerpt,
		CoverImage:     MediaToDTO(p.CoverImage),
		Category:       CategoryToDTO(p.Category, nil),
		Tags:           tagsToDTO(p.Tags),
		ReadingTimeMin: p.ReadingTimeMin,
		PublishedAt:    p.PublishedAt,
	}
}

// PostToDetail maps a post to the full detail shape.
func PostToDetail(p *models.Post) PostDetailDTO {
	author := AuthorDTO{}
	if p.Author != nil {
		author.DisplayName = p.Author.DisplayName
	}
	return PostDetailDTO{
		PostSummaryDTO: PostToSummary(p),
		Content:        p.Content,
		ContentFormat:  p.ContentFormat,
		SEOTitle:       p.SEOTitle,
		SEODescription: p.SEODescription,
		CanonicalURL:   p.CanonicalURL,
		OGImage:        MediaToDTO(p.OGImage),
		Author:         author,
		Status:         string(p.Status),
		UpdatedAt:      p.UpdatedAt,
	}
}

// PostToAdminSummary maps a post to the admin list row.
func PostToAdminSummary(p *models.Post) PostAdminSummaryDTO {
	return PostAdminSummaryDTO{
		ID:          p.ID,
		Title:       p.Title,
		Slug:        p.Slug,
		Status:      string(p.Status),
		Category:    CategoryToDTO(p.Category, nil),
		PublishedAt: p.PublishedAt,
		UpdatedAt:   p.UpdatedAt,
	}
}

// AdminToDTO maps an admin user to its safe API shape.
func AdminToDTO(a *models.AdminUser) AdminDTO {
	if a == nil {
		return AdminDTO{}
	}
	return AdminDTO{ID: a.ID, Email: a.Email, DisplayName: a.DisplayName}
}
