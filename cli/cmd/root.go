package cmd

import "github.com/spf13/cobra"

var rootCmd = &cobra.Command{
	Use:   "blog-photo-uploader",
	Short: "CLI tool for uploading photos to S3",
	Long:  `blog-photo-uploader is a CLI tool for uploading photos to S3. It uses Amazon Cognito for authentication and authorization. It also uses Pre-Signed URLs for uploading files to S3.`,
}

func Execute() error {
	return rootCmd.Execute()
}

func init() {
	cobra.OnInitialize()

	rootCmd.AddCommand(authCmd)
	rootCmd.AddCommand(uploadCmd)
}
