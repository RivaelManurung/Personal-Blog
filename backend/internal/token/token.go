// Package token issues and parses the JWT access/refresh tokens used for admin
// authentication. It is dependency-free (no repo/service imports) so both the
// auth service and the auth middleware can depend on it without a cycle.
package token

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Type distinguishes access tokens from refresh tokens.
type Type string

const (
	Access  Type = "access"
	Refresh Type = "refresh"
)

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrWrongType    = errors.New("wrong token type")
)

// Claims is the JWT payload. TokenVersion (tv) enables global revocation.
type Claims struct {
	AdminID      int64 `json:"aid"`
	TokenVersion int   `json:"tv"`
	Type         Type  `json:"typ"`
	jwt.RegisteredClaims
}

// Manager signs and verifies tokens with a symmetric secret (HS256).
type Manager struct {
	secret     []byte
	accessTTL  time.Duration
	refreshTTL time.Duration
}

func NewManager(secret string, accessTTL, refreshTTL time.Duration) *Manager {
	return &Manager{secret: []byte(secret), accessTTL: accessTTL, refreshTTL: refreshTTL}
}

// Issue mints a signed token of the given type, returning the string and its
// absolute expiry. Uses the injected clock `now` for testability.
func (m *Manager) Issue(t Type, adminID int64, tokenVersion int, now time.Time) (string, time.Time, error) {
	ttl := m.accessTTL
	if t == Refresh {
		ttl = m.refreshTTL
	}
	expiresAt := now.Add(ttl)

	claims := Claims{
		AdminID:      adminID,
		TokenVersion: tokenVersion,
		Type:         t,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(m.secret)
	if err != nil {
		return "", time.Time{}, err
	}
	return signed, expiresAt, nil
}

// AccessTTL exposes the configured access-token lifetime.
func (m *Manager) AccessTTL() time.Duration { return m.accessTTL }

// Parse validates a token's signature and expiry and asserts its type.
func (m *Manager) Parse(tokenStr string, want Type) (*Claims, error) {
	claims := &Claims{}
	parsed, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return m.secret, nil
	})
	if err != nil || !parsed.Valid {
		return nil, ErrInvalidToken
	}
	if claims.Type != want {
		return nil, ErrWrongType
	}
	return claims, nil
}
