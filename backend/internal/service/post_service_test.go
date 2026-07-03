package service

import "testing"

func TestSlugify(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "spaces become dashes",
			input: "Hello World",
			want:  "hello-world",
		},
		{
			name:  "lowercases mixed case",
			input: "HeLLo WoRLD",
			want:  "hello-world",
		},
		{
			name:  "strips punctuation",
			input: "Go: Concurrency, Explained!",
			want:  "go-concurrency-explained",
		},
		{
			name:  "collapses repeated separators",
			input: "too    many---spaces___here",
			want:  "too-many-spaces-here",
		},
		{
			name:  "trims leading and trailing dashes",
			input: "  --Trailing And Leading--  ",
			want:  "trailing-and-leading",
		},
		{
			name:  "already a valid slug is unchanged",
			input: "already-a-slug",
			want:  "already-a-slug",
		},
		{
			name:  "numbers are preserved",
			input: "Top 10 Go Tips 2024",
			want:  "top-10-go-tips-2024",
		},
		{
			name:  "empty string yields empty slug",
			input: "",
			want:  "",
		},
		{
			name:  "only punctuation yields empty slug",
			input: "!!!---???",
			want:  "",
		},
		{
			name:  "unicode letters are stripped as non a-z0-9",
			input: "Café Déjà Vu",
			want:  "caf-d-j-vu",
		},
		{
			name:  "unicode-only string yields empty slug",
			input: "日本語のタイトル",
			want:  "",
		},
		{
			name:  "single word no change besides lowercase",
			input: "SingleWord",
			want:  "singleword",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Act
			got := Slugify(tt.input)

			// Assert
			if got != tt.want {
				t.Errorf("Slugify(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}
