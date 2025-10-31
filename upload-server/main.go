package main

import (
	"log"
	"net/http"

	"DASH/upload-server/handlers"
	"DASH/upload-server/lib"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// step : 1 -> load env
	lib.LoadEnv()
	port := lib.GetEnv("PORT")

	// step : 1.1 -> if sync server is not active terminate
	resp, err := http.Get(lib.GetEnv("SYNC_SERVER_URL") + "/ping")
	if err != nil {
		panic("Failed to connect to sync server")
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		log.Fatal("Sync server is not active")
	}
	log.Println("Sync server is active")

	// step : 2 -> initialize router
	router := gin.Default()
	router.MaxMultipartMemory = 500 << 20 // 500MB
	router.Use(cors.Default())

	router.GET("/", handlers.WelcomeHandler)
	router.GET("/ping", handlers.PingHandler)
	router.POST("/upload", handlers.UploadHandler)

	log.Printf("Starting upload server on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
