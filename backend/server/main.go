package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"sim-sekolah/config"
	"sim-sekolah/app/routes"
)

func main() {
	// Load config & connect DB
	config.LoadEnv()
	config.ConnectDB()
	config.MigrateDB()

	// Set Gin mode
	if os.Getenv("APP_ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// Register semua routes
	routes.RegisterRoutes(r)

	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 SIM Sekolah berjalan di port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Gagal menjalankan server:", err)
	}
}