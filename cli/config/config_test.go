package config_test

import (
	"os"
	"path/filepath"
	"s3-uploader/config"
	"testing"
	"time"

	"github.com/golang-jwt/jwt"
)

func generateMockToken(expiration time.Time) string {
	claims := jwt.MapClaims{
		"exp": expiration.Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodNone, claims)
	signedToken, _ := token.SignedString(jwt.UnsafeAllowNoneSignatureType)
	return signedToken
}

func TestLoadConfig_Success(t *testing.T) {
	testPath := filepath.Join(os.TempDir(), "test-config.json")
	validToken := generateMockToken(time.Now().Add(time.Hour))
	testConfig := &config.Config{
		ClientID:    "test-client-id",
		Username:    "test-username",
		Password:    "test-password",
		APIEndpoint: "test-api-endpoint",
		IDToken:     validToken,
	}
	if err := config.SaveConfig(testPath, testConfig); err != nil {
		t.Fatalf("failed to save test config: %v", err)
	}
	defer os.Remove(testPath)

	loadedConfig, err := config.LoadConfig(testPath)
	if err != nil {
		t.Fatalf("failed to load config: %v", err)
	}

	if loadedConfig.ClientID != "test-client-id" {
		t.Errorf("expected ClientID to be 'test-client-id', got %s", loadedConfig.ClientID)
	}
}

func TestLoadConfig_Failure(t *testing.T) {
	_, err := config.LoadConfig("non-existent-file")
	if err == nil {
		t.Fatal("expected an error, got nil")
	}
}
