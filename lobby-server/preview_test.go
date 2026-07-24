package main

import (
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
)

const testTrackID = "11dFghVXANMlKmJXsNCbNl"

func TestExtractPreviewURL(t *testing.T) {
	html := []byte(`<html><body>
		<script>{"props":{"entity":{"audioPreview":{"url":"https://p.scdn.co/mp3-preview/example"}}}}</script>
	</body></html>`)

	previewURL, err := extractPreviewURL(html)
	if err != nil {
		t.Fatalf("extractPreviewURL returned an error: %v", err)
	}
	if previewURL != "https://p.scdn.co/mp3-preview/example" {
		t.Fatalf("unexpected preview URL: %q", previewURL)
	}
}

func TestPreviewResolverRejectsInvalidTrackID(t *testing.T) {
	resolver := NewPreviewResolver(http.DefaultClient)
	req := httptest.NewRequest(http.MethodGet, "/preview/not-a-track", nil)
	recorder := httptest.NewRecorder()

	resolver.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, recorder.Code)
	}
}

func TestPreviewResolverReturnsNotFound(t *testing.T) {
	embedServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(`<html><script>{"audioPreview":null}</script></html>`))
	}))
	defer embedServer.Close()

	resolver := NewPreviewResolver(embedServer.Client())
	resolver.embedBaseURL = embedServer.URL + "/"

	req := httptest.NewRequest(http.MethodGet, "/preview/"+testTrackID, nil)
	recorder := httptest.NewRecorder()
	resolver.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d", http.StatusNotFound, recorder.Code)
	}
}

func TestPreviewResolverRedirectsAndCaches(t *testing.T) {
	var requests atomic.Int32
	embedServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requests.Add(1)
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(
			`<html><script>{"audioPreview":{"url":"https://p.scdn.co/mp3-preview/example"}}</script></html>`,
		))
	}))
	defer embedServer.Close()

	resolver := NewPreviewResolver(embedServer.Client())
	resolver.embedBaseURL = embedServer.URL + "/"

	for range 2 {
		req := httptest.NewRequest(http.MethodGet, "/preview/"+testTrackID, nil)
		recorder := httptest.NewRecorder()
		resolver.ServeHTTP(recorder, req)

		if recorder.Code != http.StatusTemporaryRedirect {
			t.Fatalf("expected status %d, got %d", http.StatusTemporaryRedirect, recorder.Code)
		}
		if location := recorder.Header().Get("Location"); location != "https://p.scdn.co/mp3-preview/example" {
			t.Fatalf("unexpected redirect location: %q", location)
		}
	}

	if requests.Load() != 1 {
		t.Fatalf("expected one embed request, got %d", requests.Load())
	}
}
