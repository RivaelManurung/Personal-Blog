package token

import (
	"errors"
	"testing"
	"time"
)

func newTestManager() *Manager {
	return NewManager("test-secret-key-for-jwt-signing", 15*time.Minute, 24*time.Hour)
}

func TestManager_IssueAndParse_RoundTrips(t *testing.T) {
	tests := []struct {
		name      string
		tokenType Type
	}{
		{name: "access token round-trips", tokenType: Access},
		{name: "refresh token round-trips", tokenType: Refresh},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			m := newTestManager()
			now := time.Now()
			const adminID int64 = 42
			const tv = 7

			// Act
			signed, expiresAt, err := m.Issue(tt.tokenType, adminID, tv, now)
			if err != nil {
				t.Fatalf("Issue returned unexpected error: %v", err)
			}
			claims, parseErr := m.Parse(signed, tt.tokenType)

			// Assert
			if parseErr != nil {
				t.Fatalf("Parse returned unexpected error: %v", parseErr)
			}
			if claims.AdminID != adminID {
				t.Errorf("AdminID = %d, want %d", claims.AdminID, adminID)
			}
			if claims.TokenVersion != tv {
				t.Errorf("TokenVersion = %d, want %d", claims.TokenVersion, tv)
			}
			if claims.Type != tt.tokenType {
				t.Errorf("Type = %q, want %q", claims.Type, tt.tokenType)
			}
			if claims.ExpiresAt == nil || claims.ExpiresAt.Time.Unix() != expiresAt.Unix() {
				t.Errorf("claims expiry %v does not match issued expiry %v", claims.ExpiresAt, expiresAt)
			}
		})
	}
}

func TestManager_Parse_RejectsWrongType(t *testing.T) {
	// Arrange
	m := newTestManager()
	signed, _, err := m.Issue(Access, 1, 0, time.Now())
	if err != nil {
		t.Fatalf("Issue returned unexpected error: %v", err)
	}

	// Act
	_, err = m.Parse(signed, Refresh)

	// Assert
	if !errors.Is(err, ErrWrongType) {
		t.Fatalf("Parse error = %v, want ErrWrongType", err)
	}
}

func TestManager_Parse_RejectsTamperedToken(t *testing.T) {
	// Arrange
	m := newTestManager()
	signed, _, err := m.Issue(Access, 1, 0, time.Now())
	if err != nil {
		t.Fatalf("Issue returned unexpected error: %v", err)
	}
	tampered := signed[:len(signed)-2] + "xx"

	// Act
	_, err = m.Parse(tampered, Access)

	// Assert
	if !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("Parse error = %v, want ErrInvalidToken", err)
	}
}

func TestManager_Parse_RejectsGarbageToken(t *testing.T) {
	// Arrange
	m := newTestManager()

	// Act
	_, err := m.Parse("this-is-not-a-jwt-at-all", Access)

	// Assert
	if !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("Parse error = %v, want ErrInvalidToken", err)
	}
}

func TestManager_Parse_RejectsTokenSignedWithDifferentSecret(t *testing.T) {
	// Arrange
	issuer := NewManager("secret-a", 15*time.Minute, 24*time.Hour)
	verifier := NewManager("secret-b", 15*time.Minute, 24*time.Hour)
	signed, _, err := issuer.Issue(Access, 1, 0, time.Now())
	if err != nil {
		t.Fatalf("Issue returned unexpected error: %v", err)
	}

	// Act
	_, err = verifier.Parse(signed, Access)

	// Assert
	if !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("Parse error = %v, want ErrInvalidToken", err)
	}
}

func TestManager_Parse_RejectsExpiredToken(t *testing.T) {
	// Arrange
	m := newTestManager()
	past := time.Now().Add(-48 * time.Hour) // well before even the refresh TTL
	signed, _, err := m.Issue(Access, 1, 0, past)
	if err != nil {
		t.Fatalf("Issue returned unexpected error: %v", err)
	}

	// Act
	_, err = m.Parse(signed, Access)

	// Assert
	if !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("Parse error = %v, want ErrInvalidToken (expired)", err)
	}
}

func TestManager_AccessTTL_ExposesConfiguredValue(t *testing.T) {
	// Arrange
	accessTTL := 20 * time.Minute
	m := NewManager("secret", accessTTL, time.Hour)

	// Act
	got := m.AccessTTL()

	// Assert
	if got != accessTTL {
		t.Errorf("AccessTTL() = %v, want %v", got, accessTTL)
	}
}
