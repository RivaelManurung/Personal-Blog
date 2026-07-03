package models

import "time"

// Category groups posts; a post belongs to at most one.
type Category struct {
	ID          int64  `gorm:"primaryKey"`
	Name        string `gorm:"not null"`
	Slug        string `gorm:"uniqueIndex;not null"`
	Description string `gorm:"not null;default:''"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// Tag labels posts in a many-to-many relationship.
type Tag struct {
	ID        int64  `gorm:"primaryKey"`
	Name      string `gorm:"not null"`
	Slug      string `gorm:"uniqueIndex;not null"`
	CreatedAt time.Time
}
