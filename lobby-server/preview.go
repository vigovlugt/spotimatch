package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"golang.org/x/net/html"
)

const (
	spotifyEmbedBaseURL = "https://open.spotify.com/embed/track/"
	maxEmbedPageBytes   = 2 << 20
	previewCacheTTL     = 24 * time.Hour
)

var (
	spotifyTrackIDPattern = regexp.MustCompile(`^[A-Za-z0-9]{22}$`)
	errPreviewNotFound    = errors.New("preview not found")
)

type previewCacheEntry struct {
	url       string
	expiresAt time.Time
}

type PreviewResolver struct {
	client       *http.Client
	embedBaseURL string

	mu    sync.RWMutex
	cache map[string]previewCacheEntry
}

func NewPreviewResolver(client *http.Client) *PreviewResolver {
	return &PreviewResolver{
		client:       client,
		embedBaseURL: spotifyEmbedBaseURL,
		cache:        make(map[string]previewCacheEntry),
	}
}

func (resolver *PreviewResolver) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	trackID := strings.TrimPrefix(r.URL.Path, "/preview/")
	if !spotifyTrackIDPattern.MatchString(trackID) {
		http.Error(w, "Invalid Spotify track ID", http.StatusBadRequest)
		return
	}

	previewURL, err := resolver.Resolve(r.Context(), trackID)
	if errors.Is(err, errPreviewNotFound) {
		http.Error(w, "Preview not available", http.StatusNotFound)
		return
	}
	if err != nil {
		logPreviewError(trackID, err)
		http.Error(w, "Could not fetch Spotify preview", http.StatusBadGateway)
		return
	}

	http.Redirect(w, r, previewURL, http.StatusTemporaryRedirect)
}

func (resolver *PreviewResolver) Resolve(ctx context.Context, trackID string) (string, error) {
	if previewURL, ok := resolver.cached(trackID); ok {
		return previewURL, nil
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, resolver.embedBaseURL+trackID, nil)
	if err != nil {
		return "", fmt.Errorf("create embed request: %w", err)
	}
	req.Header.Set("Accept", "text/html")
	req.Header.Set("User-Agent", "Spotimatch/1.0")

	resp, err := resolver.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("fetch embed page: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("fetch embed page: unexpected status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxEmbedPageBytes+1))
	if err != nil {
		return "", fmt.Errorf("read embed page: %w", err)
	}
	if len(body) > maxEmbedPageBytes {
		return "", errors.New("embed page exceeds maximum size")
	}

	previewURL, err := extractPreviewURL(body)
	if err != nil {
		return "", err
	}

	resolver.mu.Lock()
	resolver.cache[trackID] = previewCacheEntry{
		url:       previewURL,
		expiresAt: time.Now().Add(previewCacheTTL),
	}
	resolver.mu.Unlock()

	return previewURL, nil
}

func (resolver *PreviewResolver) cached(trackID string) (string, bool) {
	resolver.mu.RLock()
	entry, ok := resolver.cache[trackID]
	resolver.mu.RUnlock()

	if !ok || time.Now().After(entry.expiresAt) {
		if ok {
			resolver.mu.Lock()
			delete(resolver.cache, trackID)
			resolver.mu.Unlock()
		}
		return "", false
	}

	return entry.url, true
}

func extractPreviewURL(body []byte) (string, error) {
	document, err := html.Parse(bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("parse embed page: %w", err)
	}

	var visit func(*html.Node) string
	visit = func(node *html.Node) string {
		if node.Type == html.ElementNode && node.Data == "script" {
			for child := node.FirstChild; child != nil; child = child.NextSibling {
				if child.Type != html.TextNode {
					continue
				}

				var data any
				if json.Unmarshal([]byte(strings.TrimSpace(child.Data)), &data) == nil {
					if previewURL := findAudioPreviewURL(data); previewURL != "" {
						return previewURL
					}
				}
			}
		}

		for child := node.FirstChild; child != nil; child = child.NextSibling {
			if previewURL := visit(child); previewURL != "" {
				return previewURL
			}
		}
		return ""
	}

	previewURL := visit(document)
	if previewURL == "" {
		return "", errPreviewNotFound
	}

	parsedURL, err := url.Parse(previewURL)
	if err != nil || parsedURL.Scheme != "https" || parsedURL.Hostname() != "p.scdn.co" {
		return "", errors.New("embed page returned an invalid preview URL")
	}

	return previewURL, nil
}

// Adapted from https://stackoverflow.com/a/79238027 by Diego Perez and
// community contributors, retrieved 2026-07-21, licensed under CC BY-SA 4.0.
func findAudioPreviewURL(value any) string {
	switch value := value.(type) {
	case map[string]any:
		if audioPreview, ok := value["audioPreview"].(map[string]any); ok {
			if previewURL, ok := audioPreview["url"].(string); ok {
				return previewURL
			}
		}
		for _, child := range value {
			if previewURL := findAudioPreviewURL(child); previewURL != "" {
				return previewURL
			}
		}
	case []any:
		for _, child := range value {
			if previewURL := findAudioPreviewURL(child); previewURL != "" {
				return previewURL
			}
		}
	}

	return ""
}

func logPreviewError(trackID string, err error) {
	// Keep the handler's response generic while retaining enough server context.
	fmt.Printf("Failed to resolve preview for track %s: %v\n", trackID, err)
}
