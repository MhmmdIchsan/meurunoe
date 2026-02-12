package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

func LoadEnv() {
	env := os.Getenv("APP_ENV")
	if env == "" {
		env = "development"
	}

	if env == "development" {
		if err := godotenv.Load(".env"); err != nil {
			log.Println("⚠️  File .env tidak ditemukan, menggunakan environment variable sistem")
		}
	}

	log.Printf("✅ Environment: %s", env)
}