package models

import "time"

// PostStatus mirrors the post_status Postgres enum.
type PostStatus string

const (
	StatusDraft     PostStatus = "draft"
	StatusScheduled PostStatus = "scheduled"
	StatusPublished PostStatus = "published"
)

// Post represents a single blog article.
type Post struct {
	ID             int64      `gorm:"primaryKey"`
	Title          string     `gorm:"not null"`
	Slug           string     `gorm:"uniqueIndex;not null"`
	Excerpt        string     `gorm:"not null;default:''"`
	Content        string     `gorm:"type:text;not null;default:''"`
	ContentFormat  string     `gorm:"not null;default:'html'"`
	CoverImageID   *int64     `gorm:"column:cover_image_id"`
	CoverImage     *Media     `gorm:"foreignKey:CoverImageID"`
	OGImageID      *int64     `gorm:"column:og_image_id"`
	OGImage        *Media     `gorm:"foreignKey:OGImageID"`
	CategoryID     *int64     `gorm:"column:category_id"`
	Category       *Category  `gorm:"foreignKey:CategoryID"`
	AuthorID       int64      `gorm:"not null"`
	Author         *AdminUser `gorm:"foreignKey:AuthorID"`
	Status         PostStatus `gorm:"type:post_status;not null;default:'draft'"`
	PublishedAt    *time.Time `gorm:"column:published_at"`
	ReadingTimeMin int        `gorm:"not null;default:1"`
	SEOTitle       string     `gorm:"column:seo_title;not null;default:''"`
	SEODescription string     `gorm:"column:seo_description;not null;default:''"`
	CanonicalURL   string     `gorm:"column:canonical_url;not null;default:''"`
	Tags           []Tag      `gorm:"many2many:post_tags;"`

	// SearchVector is a generated tsvector column: read-only, never written by GORM.
	SearchVector string `gorm:"->;type:tsvector" json:"-"`

	CreatedAt time.Time
	UpdatedAt time.Time
}
