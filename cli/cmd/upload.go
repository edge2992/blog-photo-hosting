package cmd

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"s3-uploader/api"
	"s3-uploader/config"
	"s3-uploader/upload"

	"github.com/spf13/cobra"
)

var filePath string
var s3Key string

var uploadCmd = &cobra.Command{
	Use:   "upload",
	Short: "Upload a photo to S3",
	Run: func(cmd *cobra.Command, args []string) {
		configPath := filepath.Join(os.Getenv("HOME"), ".config", "blog-photo-uploader", "config.json")
		cfg, err := config.LoadConfig(configPath)
		if err != nil {
			log.Fatalf("failed to load configuration: %v", err)
		}
		preSignedURL, err := api.GetPresignedURL(cfg.APIEndpoint, cfg.IDToken, s3Key)
		if err != nil {
			log.Fatalf("failed to get pre-signed URL: %v", err)
		}

		err = upload.UploadFileToS3(preSignedURL, filePath)
		if err != nil {
			log.Fatalf("failed to upload file to S3: %v", err)
		}

		cloudFrontURL := fmt.Sprintf("https://%s/%s", cfg.CloudFrontDomain, s3Key)

		fmt.Println("Successfully uploaded file to S3")
		fmt.Printf("CloudFront URL: %s\n", cloudFrontURL)
	},
}

func init() {
	uploadCmd.Flags().StringVarP(&filePath, "file", "f", "", "Path to the file to upload")
	uploadCmd.Flags().StringVarP(&s3Key, "key", "k", "", "S3 key for the updated file")

	_ = uploadCmd.MarkFlagRequired("file")
	_ = uploadCmd.MarkFlagRequired("key")
}
