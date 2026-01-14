package main

import (
	"context"
	"log"
	"os"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

type AppDeps struct {
	DDB *dynamodb.Client

	QuizTable    string
	AttemptTable string

	AppUser     string
	AppPass     string
	TokenSecret string
}

func LoadDeps() *AppDeps {
	region := os.Getenv("AWS_REGION")
	if region == "" {
		log.Fatal("AWS_REGION env is required")
	}

	quizTable := os.Getenv("DDB_TABLE_QUIZZES")
	if quizTable == "" {
		log.Fatal("DDB_TABLE_QUIZZES env is required")
	}

	attemptTable := os.Getenv("DDB_TABLE_ATTEMPTS")
	if attemptTable == "" {
		log.Fatal("DDB_TABLE_ATTEMPTS env is required")
	}

	appUser := os.Getenv("APP_USER")
	appPass := os.Getenv("APP_PASS")
	if appUser == "" || appPass == "" {
		log.Fatal("APP_USER and APP_PASS env are required")
	}

	tokenSecret := os.Getenv("TOKEN_SECRET")
	if tokenSecret == "" {
		log.Fatal("TOKEN_SECRET env is required")
	}

	cfg, err := config.LoadDefaultConfig(context.Background(), config.WithRegion(region))
	if err != nil {
		log.Fatalf("failed to load AWS config: %v", err)
	}

	return &AppDeps{
		DDB:          dynamodb.NewFromConfig(cfg),
		QuizTable:    quizTable,
		AttemptTable: attemptTable,
		AppUser:      appUser,
		AppPass:      appPass,
		TokenSecret:  tokenSecret,
	}
}

func getenvDefault(k, def string) string {
	v := os.Getenv(k)
	if v == "" {
		return def
	}
	return v
}

func boolPtr(v bool) *bool { return &v }
