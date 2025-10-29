package main

import (
	"log"

	"DASH/upload-server/handlers"
	"DASH/upload-server/lib"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// step : 1 -> load env
	lib.LoadEnv()
	port := lib.GetEnv("PORT")

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
