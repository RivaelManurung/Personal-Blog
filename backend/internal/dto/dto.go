// Package dto defines the request and response shapes for the HTTP layer.
// These are the single source of truth the frontend Zod schemas mirror.
package dto

import "time"

// ---------- Auth ----------

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refreshToken" validate:"required"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword" validate:"required"`
	NewPassword     string `json:"newPassword" validate:"required,min=8"`
}

type AdminDTO struct {
	ID          int64  `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
}

type LoginResponse struct {
	AccessToken  string    `json:"accessToken"`
	RefreshToken string    `json:"refreshToken"`
	ExpiresAt    time.Time `json:"expiresAt"`
	Admin        AdminDTO  `json:"admin"`
}

type TokenResponse struct {
	AccessToken  string    `json:"accessToken"`
	RefreshToken string    `json:"refreshToken"`
	ExpiresAt    time.Time `json:"expiresAt"`
}

// ---------- Media ----------

type MediaDTO struct {
	ID          int64  `json:"id"`
	URL         string `json:"url"`
	Width       int    `json:"width"`
	Height      int    `json:"height"`
	BlurDataURL string `json:"blurDataURL"`
	AltText     string `json:"altText"`
}

// ---------- Taxonomy ----------

type CategoryDTO struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Description string `json:"description,omitempty"`
	PostCount   *int64 `json:"postCount,omitempty"`
}

type TagDTO struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Slug      string `json:"slug"`
	PostCount *int64 `json:"postCount,omitempty"`
}

type CategoryRequest struct {
	Name        string `json:"name" validate:"required,max=100"`
	Slug        string `json:"slug" validate:"omitempty,max=120"`
	Description string `json:"description" validate:"max=500"`
}

type TagRequest struct {
	Name string `json:"name" validate:"required,max=100"`
	Slug string `json:"slug" validate:"omitempty,max=120"`
}

// ---------- Posts ----------

type AuthorDTO struct {
	DisplayName string `json:"displayName"`
}

type PostSummaryDTO struct {
	ID             int64        `json:"id"`
	Title          string       `json:"title"`
	Slug           string       `json:"slug"`
	Excerpt        string       `json:"excerpt"`
	CoverImage     *MediaDTO    `json:"coverImage"`
	Category       *CategoryDTO `json:"category"`
	Tags           []TagDTO     `json:"tags"`
	ReadingTimeMin int          `json:"readingTimeMin"`
	PublishedAt    *time.Time   `json:"publishedAt"`
	Index          *int         `json:"index,omitempty"`
}

type PostDetailDTO struct {
	PostSummaryDTO
	Content        string    `json:"content"`
	ContentFormat  string    `json:"contentFormat"`
	SEOTitle       string    `json:"seoTitle"`
	SEODescription string    `json:"seoDescription"`
	CanonicalURL   string    `json:"canonicalUrl"`
	OGImage        *MediaDTO `json:"ogImage"`
	Author         AuthorDTO `json:"author"`
	Status         string    `json:"status"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// PostAdminSummaryDTO is the admin list row (includes drafts/scheduled).
type PostAdminSummaryDTO struct {
	ID          int64        `json:"id"`
	Title       string       `json:"title"`
	Slug        string       `json:"slug"`
	Status      string       `json:"status"`
	Category    *CategoryDTO `json:"category"`
	PublishedAt *time.Time   `json:"publishedAt"`
	UpdatedAt   time.Time    `json:"updatedAt"`
}

type SearchHitDTO struct {
	ID      int64   `json:"id"`
	Title   string  `json:"title"`
	Slug    string  `json:"slug"`
	Excerpt string  `json:"excerpt"`
	Snippet string  `json:"snippet"`
	Rank    float64 `json:"rank"`
}

type StatsDTO struct {
	Total     int64 `json:"total"`
	Published int64 `json:"published"`
	Drafts    int64 `json:"drafts"`
	Scheduled int64 `json:"scheduled"`
}

// CreatePostRequest / UpdatePostRequest share a shape (full replace on update).
type CreatePostRequest struct {
	Title          string     `json:"title" validate:"required,max=200"`
	Slug           string     `json:"slug" validate:"omitempty,max=220"`
	Excerpt        string     `json:"excerpt" validate:"max=500"`
	Content        string     `json:"content" validate:"required"`
	ContentFormat  string     `json:"contentFormat" validate:"omitempty,oneof=html markdown"`
	CategoryID     *int64     `json:"categoryId"`
	TagIDs         []int64    `json:"tagIds" validate:"omitempty,dive,gt=0"`
	CoverImageID   *int64     `json:"coverImageId"`
	OGImageID      *int64     `json:"ogImageId"`
	Status         string     `json:"status" validate:"omitempty,oneof=draft scheduled published"`
	PublishedAt    *time.Time `json:"publishedAt"`
	SEOTitle       string     `json:"seoTitle" validate:"max=200"`
	SEODescription string     `json:"seoDescription" validate:"max=300"`
	CanonicalURL   string     `json:"canonicalUrl" validate:"omitempty,url,max=500"`
}

type UpdatePostRequest = CreatePostRequest

type UpdateStatusRequest struct {
	Status      string     `json:"status" validate:"required,oneof=draft scheduled published"`
	PublishedAt *time.Time `json:"publishedAt"`
}
