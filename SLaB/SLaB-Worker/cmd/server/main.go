package main

import (
	"DASH/SLaB/worker/handler"
	"DASH/SLaB/worker/lib"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// step : 1 -> load env
	lib.LoadEnv()
	port := lib.GetEnv("PORT")

	// step : 2 -> create router
	router := gin.Default()
	router.MaxMultipartMemory = 500 << 20 // 500MB
	router.Use(cors.Default())

	// step : 3 -> add handlers
	router.GET("/ping", handler.PingHandler)

	// step : 4 -> start server
	log.Printf("Starting sync server on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
