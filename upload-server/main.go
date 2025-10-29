package main

import (
	"log"

	"DASH/upload-server/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	router := gin.Default()
	router.MaxMultipartMemory = 500 << 20 // 500MB
	router.Use(cors.Default())

	router.GET("/", handlers.WelcomeHandler)
	router.GET("/ping", handlers.PingHandler)
	router.POST("/upload", handlers.UploadHandler)

	log.Println("Starting upload server on port 6969")
	if err := router.Run(":6969"); err != nil {
		log.Fatal(err)
	}
}
