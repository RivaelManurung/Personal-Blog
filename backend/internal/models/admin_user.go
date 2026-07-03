package models

import "time"

// AdminUser is a blog administrator (single-admin today; table allows more).
type AdminUser struct {
	ID           int64      `gorm:"primaryKey"`
	Email        string     `gorm:"type:citext;uniqueIndex;not null"`
	PasswordHash string     `gorm:"column:password_hash;not null"`
	DisplayName  string     `gorm:"column:display_name;not null;default:''"`
	TokenVersion int        `gorm:"column:token_version;not null;default:0"`
	LastLoginAt  *time.Time `gorm:"column:last_login_at"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}
