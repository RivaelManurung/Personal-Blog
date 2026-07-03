package service

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/rivael/blog-backend/internal/config"
	"github.com/rivael/blog-backend/internal/models"
	"github.com/rivael/blog-backend/internal/repository"
)

var (
	// ErrFileTooLarge is returned when an upload exceeds the configured
	// maximum size.
	ErrFileTooLarge = errors.New("file too large")
	// ErrUnsupportedType is returned when an upload's MIME type is not in
	// the image allowlist.
	ErrUnsupportedType = errors.New("unsupported file type")
)

// allowedMimeTypes maps accepted MIME types to their canonical file
// extension.
var allowedMimeTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
	"image/avif": ".avif",
}

const blurThumbWidth = 16

// storageDriver abstracts where uploaded file bytes are persisted, so a
// future S3/Supabase driver can slot in behind the same interface.
type storageDriver interface {
	Save(ctx context.Context, filename string, content []byte) error
	Delete(ctx context.Context, filename string) error
	PublicURL(filename string) string
}

// localDriver stores files on the local filesystem under a base path.
type localDriver struct {
	basePath string
}

func newLocalDriver(basePath string) *localDriver {
	return &localDriver{basePath: basePath}
}

func (d *localDriver) Save(_ context.Context, filename string, content []byte) error {
	if err := os.MkdirAll(d.basePath, 0o755); err != nil {
		return fmt.Errorf("create storage dir: %w", err)
	}
	path := filepath.Join(d.basePath, filename)
	return os.WriteFile(path, content, 0o644)
}

func (d *localDriver) Delete(_ context.Context, filename string) error {
	path := filepath.Join(d.basePath, filename)
	return os.Remove(path)
}

func (d *localDriver) PublicURL(filename string) string {
	return "/uploads/" + filename
}

// supabaseDriver stores files in Supabase Storage via its REST API.
type supabaseDriver struct {
	url    string
	key    string
	bucket string
	client *http.Client
}

func newSupabaseDriver(url, key, bucket string) *supabaseDriver {
	return &supabaseDriver{
		url:    strings.TrimRight(url, "/"),
		key:    key,
		bucket: bucket,
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

func (d *supabaseDriver) Save(ctx context.Context, filename string, content []byte) error {
	endpoint := fmt.Sprintf("%s/storage/v1/object/%s/%s", d.url, d.bucket, filename)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(content))
	if err != nil {
		return fmt.Errorf("create supabase upload request: %w", err)
	}

	mimeType := http.DetectContentType(content)
	req.Header.Set("Authorization", "Bearer "+d.key)
	req.Header.Set("apikey", d.key)
	req.Header.Set("Content-Type", mimeType)
	req.Header.Set("x-upsert", "true")

	resp, err := d.client.Do(req)
	if err != nil {
		return fmt.Errorf("supabase upload request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("supabase upload failed with status %d: %s", resp.StatusCode, string(body))
	}
	return nil
}

func (d *supabaseDriver) Delete(ctx context.Context, filename string) error {
	endpoint := fmt.Sprintf("%s/storage/v1/object/%s/%s", d.url, d.bucket, filename)
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, endpoint, nil)
	if err != nil {
		return fmt.Errorf("create supabase delete request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+d.key)
	req.Header.Set("apikey", d.key)

	resp, err := d.client.Do(req)
	if err != nil {
		return fmt.Errorf("supabase delete request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || (resp.StatusCode >= 300 && resp.StatusCode != http.StatusNotFound) {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("supabase delete failed with status %d: %s", resp.StatusCode, string(body))
	}
	return nil
}

func (d *supabaseDriver) PublicURL(filename string) string {
	return fmt.Sprintf("%s/storage/v1/object/public/%s/%s", d.url, d.bucket, filename)
}

// MediaService implements upload validation, storage, and metadata
// persistence for media assets.
type MediaService struct {
	repo   repository.MediaRepository
	cfg    *config.Config
	driver storageDriver
}

// NewMediaService constructs a MediaService using the configured storage driver
// ("local" or "supabase").
func NewMediaService(repo repository.MediaRepository, cfg *config.Config) *MediaService {
	var driver storageDriver
	switch strings.ToLower(cfg.StorageDriver) {
	case "supabase":
		driver = newSupabaseDriver(cfg.SupabaseURL, cfg.SupabaseKey, cfg.SupabaseBucket)
	default:
		driver = newLocalDriver(cfg.StoragePath)
	}
	return &MediaService{
		repo:   repo,
		cfg:    cfg,
		driver: driver,
	}
}

// Save validates, stores, and records a new media upload.
func (s *MediaService) Save(ctx context.Context, fh *multipart.FileHeader, altText string) (*models.Media, error) {
	if fh.Size > s.cfg.MediaMaxBytes {
		return nil, ErrFileTooLarge
	}

	file, err := fh.Open()
	if err != nil {
		return nil, fmt.Errorf("open upload: %w", err)
	}
	defer file.Close()

	content, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("read upload: %w", err)
	}
	if int64(len(content)) > s.cfg.MediaMaxBytes {
		return nil, ErrFileTooLarge
	}

	sniffLen := 512
	if len(content) < sniffLen {
		sniffLen = len(content)
	}
	sniffed := http.DetectContentType(content[:sniffLen])
	sniffedBase, _, _ := strings.Cut(sniffed, ";")

	headerType := fh.Header.Get("Content-Type")
	headerBase, _, _ := strings.Cut(headerType, ";")

	ext, sniffedOK := allowedMimeTypes[sniffedBase]
	_, headerOK := allowedMimeTypes[headerBase]
	if !sniffedOK || !headerOK {
		return nil, ErrUnsupportedType
	}

	sum := sha256.Sum256(content)
	filename := hex.EncodeToString(sum[:])[:16] + ext

	if err := s.driver.Save(ctx, filename, content); err != nil {
		return nil, fmt.Errorf("save file: %w", err)
	}

	width, height, blurDataURL := decodeImageMeta(sniffedBase, content)

	media := &models.Media{
		Filename:     filename,
		OriginalName: fh.Filename,
		MimeType:     sniffedBase,
		SizeBytes:    int64(len(content)),
		Width:        width,
		Height:       height,
		BlurDataURL:  blurDataURL,
		AltText:      altText,
		URL:          s.driver.PublicURL(filename),
	}

	if err := s.repo.Create(ctx, media); err != nil {
		_ = s.driver.Delete(ctx, filename)
		return nil, err
	}

	return media, nil
}

// Delete removes a media row and best-effort removes the backing file.
func (s *MediaService) Delete(ctx context.Context, id int64) (bool, error) {
	m, err := s.repo.FindByID(ctx, id)
	if err != nil {
		if repository.IsNotFound(err) {
			return false, nil
		}
		return false, err
	}

	ok, err := s.repo.Delete(ctx, id)
	if err != nil {
		return false, err
	}
	if ok {
		_ = s.driver.Delete(ctx, m.Filename)
	}
	return ok, nil
}

// decodeImageMeta decodes width/height and builds a tiny base64 blur data
// URL for MIME types the standard library can decode (jpeg/png). For other
// supported types (webp/avif) it degrades gracefully, returning zero
// dimensions and an empty blur URL rather than an error.
func decodeImageMeta(mimeType string, content []byte) (width, height int, blurDataURL string) {
	var img image.Image
	var err error

	switch mimeType {
	case "image/jpeg":
		img, err = jpeg.Decode(bytes.NewReader(content))
	case "image/png":
		img, err = png.Decode(bytes.NewReader(content))
	default:
		return 0, 0, ""
	}
	if err != nil || img == nil {
		return 0, 0, ""
	}

	bounds := img.Bounds()
	width, height = bounds.Dx(), bounds.Dy()
	if width == 0 || height == 0 {
		return width, height, ""
	}

	thumbHeight := blurThumbWidth * height / width
	if thumbHeight < 1 {
		thumbHeight = 1
	}
	thumb := downscale(img, blurThumbWidth, thumbHeight)

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, thumb, &jpeg.Options{Quality: 50}); err != nil {
		return width, height, ""
	}

	blurDataURL = "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(buf.Bytes())
	return width, height, blurDataURL
}

// downscale performs simple nearest-neighbor resampling, sufficient for a
// tiny blur placeholder.
func downscale(src image.Image, w, h int) image.Image {
	bounds := src.Bounds()
	srcW, srcH := bounds.Dx(), bounds.Dy()
	dst := image.NewRGBA(image.Rect(0, 0, w, h))

	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			srcX := bounds.Min.X + x*srcW/w
			srcY := bounds.Min.Y + y*srcH/h
			dst.Set(x, y, src.At(srcX, srcY))
		}
	}
	return dst
}
