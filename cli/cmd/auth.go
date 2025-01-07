package cmd

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"s3-uploader/cognito"
	"s3-uploader/config"

	"github.com/spf13/cobra"
)

var authCmd = &cobra.Command{
	Use:   "auth",
	Short: "Authenticate with Amazon Cognito",
	Run: func(cmd *cobra.Command, args []string) {
		configPath := filepath.Join(os.Getenv("HOME"), ".config", "blog-photo-uploader", "config.json")
		if _, err := os.Stat(configPath); os.IsNotExist(err) {
			fmt.Println("Config file not found. Let's create one interactively.")
			cfg := &config.Config{}

			fmt.Print("Enter Cognito Client ID: ")
			fmt.Scan(&cfg.ClientID)

			fmt.Print("Enter Cognito Username: ")
			fmt.Scan(&cfg.Username)

			fmt.Print("Enter Cognito Password: ")
			fmt.Scan(&cfg.Password)

			fmt.Print("Enter API Endpoint: ")
			fmt.Scan(&cfg.APIEndpoint)

			fmt.Print("Enter CloudFront Domain: (eg.. abcdef.cloudfront.net): ")
			fmt.Scan(&cfg.CloudFrontDomain)

			// Authenticate to verify credentials
			token, err := cognito.AuthenticateWithCognito(cfg.ClientID, cfg.Username, cfg.Password)
			if err != nil {
				log.Fatalf("Authentication failed: %v", err)
			}
			cfg.IDToken = token

			// Save config
			if err := config.SaveConfig(configPath, cfg); err != nil {
				log.Fatalf("Failed to save configuration: %v", err)
			}

			fmt.Println("Configuration saved successfully.")
		} else {
			fmt.Println("Configuration file already exists.")
		}
	},
}
