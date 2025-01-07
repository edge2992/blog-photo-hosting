package cognito

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
	"github.com/golang-jwt/jwt"
)

func AuthenticateWithCognito(clientID, username, password string) (string, error) {
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		return "", fmt.Errorf("failed to load AWS config: %w", err)
	}

	cognitoClient := cognitoidentityprovider.NewFromConfig(cfg)
	resp, err := cognitoClient.InitiateAuth(context.TODO(), &cognitoidentityprovider.InitiateAuthInput{
		AuthFlow: "USER_PASSWORD_AUTH",
		ClientId: &clientID,
		AuthParameters: map[string]string{
			"USERNAME": username,
			"PASSWORD": password,
		},
	})
	if err != nil {
		return "", fmt.Errorf("authentication request error: %w", err)
	}

	if resp.AuthenticationResult == nil || resp.AuthenticationResult.IdToken == nil {
		return "", fmt.Errorf("failed to retrieve ID token")
	}

	return *resp.AuthenticationResult.IdToken, nil
}

func IsTokenExpired(token string) bool {
	parsedToken, _, err := new(jwt.Parser).ParseUnverified(token, jwt.MapClaims{})
	if err != nil {
		return true
	}
	claims, ok := parsedToken.Claims.(jwt.MapClaims)
	if !ok {
		return true
	}

	exp, ok := claims["exp"].(float64)
	if !ok {
		return true
	}

	expTime := time.Unix(int64(exp), 0)
	return time.Now().After(expTime)
}
