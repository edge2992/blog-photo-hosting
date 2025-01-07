package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type PresignedURLResponse struct {
	URL string `json:"url"`
}

func GetPresignedURL(apiEndpoint, idToken, key string) (string, error) {
	req, err := http.NewRequest("GET", fmt.Sprintf("%s?key=%s", apiEndpoint, key), nil)
	if err != nil {
		return "", fmt.Errorf("http request creation error: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+idToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("http request error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("API error: status code %d, response %s", resp.StatusCode, body)
	}

	var response PresignedURLResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return "", fmt.Errorf("API response decode error: %w", err)
	}

	return response.URL, nil
}
