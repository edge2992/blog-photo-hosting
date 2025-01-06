package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
)

type PresignedURLResponse struct {
	URL string `json:"url"`
}

func main() {
	// 環境変数から設定を取得
	clientID := os.Getenv("COGNITO_CLIENT_ID")
	username := os.Getenv("COGNITO_USERNAME")
	password := os.Getenv("COGNITO_PASSWORD")
	apiEndpoint := os.Getenv("API_ENDPOINT")
	uploadFile := "./sample.txt"
	s3Key := "uploaded-file.txt"

	if clientID == "" || username == "" || password == "" || apiEndpoint == "" {
		log.Fatal("環境変数 COGNITO_CLIENT_ID, COGNITO_USERNAME, COGNITO_PASSWORD, API_ENDPOINT が設定されていません。")
	}

	// Step 1: Cognito 認証を実行して ID トークンを取得
	idToken, err := authenticateWithCognito(clientID, username, password)
	if err != nil {
		log.Fatalf("Cognito 認証エラー: %v", err)
	}
	fmt.Println("Cognito 認証成功。ID トークンを取得しました。")

	// Step 2: Pre-Signed URL を取得
	preSignedURL, err := getPresignedURL(apiEndpoint, idToken, s3Key)
	if err != nil {
		log.Fatalf("Pre-Signed URL の取得エラー: %v", err)
	}
	fmt.Printf("Pre-Signed URL を取得しました: %s\n", preSignedURL)

	// Step 3: ファイルをアップロード
	err = uploadFileToS3(preSignedURL, uploadFile)
	if err != nil {
		log.Fatalf("ファイルアップロードエラー: %v", err)
	}
	fmt.Println("ファイルを S3 にアップロードしました。")
}

func authenticateWithCognito(clientID, username, password string) (string, error) {
	// AWS SDK の設定をロード
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		return "", fmt.Errorf("AWS 設定の読み込みエラー: %w", err)
	}

	// Cognito クライアントを初期化
	cognitoClient := cognitoidentityprovider.NewFromConfig(cfg)

	// 認証リクエストを送信
	resp, err := cognitoClient.InitiateAuth(context.TODO(), &cognitoidentityprovider.InitiateAuthInput{
		AuthFlow: "USER_PASSWORD_AUTH",
		ClientId: &clientID,
		AuthParameters: map[string]string{
			"USERNAME": username,
			"PASSWORD": password,
		},
	})
	if err != nil {
		return "", fmt.Errorf("Cognito 認証リクエストエラー: %w", err)
	}

	// ID トークンを取得
	if resp.AuthenticationResult == nil || resp.AuthenticationResult.IdToken == nil {
		return "", fmt.Errorf("ID トークンの取得に失敗しました")
	}

	return *resp.AuthenticationResult.IdToken, nil
}

func getPresignedURL(apiEndpoint, idToken, key string) (string, error) {
	// API にリクエストを送信
	req, err := http.NewRequest("GET", fmt.Sprintf("%s?key=%s", apiEndpoint, key), nil)
	if err != nil {
		return "", fmt.Errorf("HTTP リクエスト作成エラー: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+idToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("HTTP リクエストエラー: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		return "", fmt.Errorf("API エラー: ステータスコード %d, レスポンス %s", resp.StatusCode, body)
	}

	var response PresignedURLResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return "", fmt.Errorf("API レスポンスのデコードエラー: %w", err)
	}

	return response.URL, nil
}

func uploadFileToS3(url, filePath string) error {
	// ファイルを読み込む
	fileData, err := ioutil.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("ファイル読み込みエラー: %w", err)
	}

	// S3 にアップロード
	req, err := http.NewRequest("PUT", url, bytes.NewReader(fileData))
	if err != nil {
		return fmt.Errorf("HTTP リクエスト作成エラー: %w", err)
	}
	req.Header.Set("Content-Type", "text/plain")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("ファイルアップロードエラー: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		return fmt.Errorf("アップロード失敗: ステータスコード %d, レスポンス %s", resp.StatusCode, body)
	}

	return nil
}
