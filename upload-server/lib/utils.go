package lib

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

func LoadEnv() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("No .env file found")
	}
}

func GetEnv(key string) string {
	value := os.Getenv(key)
	if value == "" {
		log.Fatalf("Environment variable '%s' not found", key)
	}
	return value
}
