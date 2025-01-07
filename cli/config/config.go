package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"s3-uploader/cognito"
)

type Config struct {
	ClientID         string `json:"client_id"`
	Username         string `json:"username"`
	Password         string `json:"password"`
	APIEndpoint      string `json:"api_endpoint"`
	IDToken          string `json:"id_token"`
	CloudFrontDomain string `json:"cloudfront_domain"`
}

func LoadConfig(configPath string) (*Config, error) {
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config: %w", err)
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config: %w", err)
	}

	if cognito.IsTokenExpired(cfg.IDToken) {
		idToken, err := cognito.AuthenticateWithCognito(cfg.ClientID, cfg.Username, cfg.Password)
		if err != nil {
			return nil, fmt.Errorf("failed to refresh ID token: %w", err)
		}

		cfg.IDToken = idToken
		if err := SaveConfig(configPath, &cfg); err != nil {
			return nil, fmt.Errorf("failed to save updated config: %w", err)
		}

		fmt.Println("ID token refreshed")
	}

	return &cfg, nil
}

func SaveConfig(configPath string, cfg *Config) error {
	if err := os.MkdirAll(filepath.Dir(configPath), 0700); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}
	return os.WriteFile(configPath, data, 0600)
}
