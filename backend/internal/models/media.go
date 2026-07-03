package models

import "time"

// Media is an uploaded image asset (post cover / OG image).
type Media struct {
	ID           int64  `gorm:"primaryKey"`
	Filename     string `gorm:"not null"`
	OriginalName string `gorm:"column:original_name;not null;default:''"`
	MimeType     string `gorm:"column:mime_type;not null"`
	SizeBytes    int64  `gorm:"column:size_bytes;not null"`
	Width        int    `gorm:"not null;default:0"`
	Height       int    `gorm:"not null;default:0"`
	BlurDataURL  string `gorm:"column:blur_data_url;not null;default:''"`
	AltText      string `gorm:"column:alt_text;not null;default:''"`
	URL          string `gorm:"column:url;not null"`
	CreatedAt    time.Time
}
