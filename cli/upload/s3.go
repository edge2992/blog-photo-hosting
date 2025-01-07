package upload

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

func UploadFileToS3(url, filePath string) error {
	fileData, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("error reading file: %w", err)
	}

	req, err := http.NewRequest("PUT", url, bytes.NewReader(fileData))
	if err != nil {
		return fmt.Errorf("HTTP request creation error: %w", err)
	}
	req.Header.Set("Content-Type", "text/plain")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("file upload error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("upload failed: status code %d, response %s", resp.StatusCode, body)
	}

	return nil
}
