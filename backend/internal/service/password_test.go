package service

import (
	"strings"
	"testing"
)

func TestHashPassword_ProducesVerifiableArgon2idString(t *testing.T) {
	// Arrange
	plain := "correct-horse-battery-staple"

	// Act
	encoded, err := HashPassword(plain)

	// Assert
	if err != nil {
		t.Fatalf("HashPassword returned unexpected error: %v", err)
	}
	if !strings.HasPrefix(encoded, "$argon2id$v=") {
		t.Fatalf("encoded hash missing argon2id prefix: %q", encoded)
	}
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 {
		t.Fatalf("expected 6 '$'-delimited parts, got %d: %q", len(parts), encoded)
	}
	if !VerifyPassword(encoded, plain) {
		t.Fatalf("VerifyPassword failed to verify freshly hashed password")
	}
}

func TestHashPassword_DifferentSaltsProduceDifferentHashes(t *testing.T) {
	// Arrange
	plain := "same-password"

	// Act
	first, err1 := HashPassword(plain)
	second, err2 := HashPassword(plain)

	// Assert
	if err1 != nil || err2 != nil {
		t.Fatalf("unexpected errors: %v, %v", err1, err2)
	}
	if first == second {
		t.Fatalf("expected different encoded hashes due to random salt, got identical: %q", first)
	}
}

func TestVerifyPassword(t *testing.T) {
	validEncoded, err := HashPassword("s3cr3t-password")
	if err != nil {
		t.Fatalf("failed to prepare fixture hash: %v", err)
	}

	tests := []struct {
		name    string
		encoded string
		plain   string
		want    bool
	}{
		{
			name:    "correct password returns true",
			encoded: validEncoded,
			plain:   "s3cr3t-password",
			want:    true,
		},
		{
			name:    "wrong password returns false",
			encoded: validEncoded,
			plain:   "wrong-password",
			want:    false,
		},
		{
			name:    "empty plain against valid hash returns false",
			encoded: validEncoded,
			plain:   "",
			want:    false,
		},
		{
			name:    "malformed encoded input - wrong part count",
			encoded: "$argon2id$v=19$m=65536,t=3,p=2$saltonly",
			plain:   "s3cr3t-password",
			want:    false,
		},
		{
			name:    "malformed encoded input - wrong algorithm tag",
			encoded: "$bcrypt$v=19$m=65536,t=3,p=2$c2FsdA$aGFzaA",
			plain:   "s3cr3t-password",
			want:    false,
		},
		{
			name:    "malformed encoded input - bad version",
			encoded: "$argon2id$v=abc$m=65536,t=3,p=2$c2FsdA$aGFzaA",
			plain:   "s3cr3t-password",
			want:    false,
		},
		{
			name:    "malformed encoded input - bad params",
			encoded: "$argon2id$v=19$m=notanumber$c2FsdA$aGFzaA",
			plain:   "s3cr3t-password",
			want:    false,
		},
		{
			name:    "malformed encoded input - invalid base64 salt",
			encoded: "$argon2id$v=19$m=65536,t=3,p=2$not-valid-b64!!$aGFzaA",
			plain:   "s3cr3t-password",
			want:    false,
		},
		{
			name:    "malformed encoded input - invalid base64 hash",
			encoded: "$argon2id$v=19$m=65536,t=3,p=2$c2FsdA$not-valid-b64!!",
			plain:   "s3cr3t-password",
			want:    false,
		},
		{
			name:    "completely empty encoded string",
			encoded: "",
			plain:   "anything",
			want:    false,
		},
		{
			name:    "plain garbage string",
			encoded: "not-an-encoded-hash-at-all",
			plain:   "anything",
			want:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Act
			got := VerifyPassword(tt.encoded, tt.plain)

			// Assert
			if got != tt.want {
				t.Errorf("VerifyPassword(%q, %q) = %v, want %v", tt.encoded, tt.plain, got, tt.want)
			}
		})
	}
}
