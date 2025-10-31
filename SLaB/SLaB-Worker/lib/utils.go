package lib

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

func LoadEnv() {
	// Get current working directory
	dir, _ := os.Getwd()

	err := godotenv.Load()
	if err != nil {
		log.Printf("Warning: Could not load .env file from %s", dir)
		log.Printf("Error: %v", err)
		log.Println("Make sure .env file exists in the project root directory")
		log.Fatal("Failed to load environment variables")
	}
	log.Println("Successfully loaded .env file")
}

func GetEnv(key string) string {
	value := os.Getenv(key)
	if value == "" {
		log.Fatalf("Environment variable '%s' not found", key)
	}
	return value
}
