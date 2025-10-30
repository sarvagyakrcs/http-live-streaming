package main

import (
	"DASH/sync-server/handler"
	"DASH/sync-server/lib"
	"log"

	"github.com/gin-gonic/gin"
)

func main() {
	// step : 1 -> load env
	lib.LoadEnv()
	port := lib.GetEnv("PORT")
	// step : 1a -> get slave buckets data
	slaveBucketsData := GetSlaveBucketsData()

	// step : 2 -> create router
	router := gin.Default()

	// step : 3 -> add handlers
	router.GET("/ping", handler.PingHandler)
	router.POST("/sync", handler.SyncHandler(slaveBucketsData))

	// step : 4 -> start server
	log.Printf("Starting sync server on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
