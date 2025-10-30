package handler

import (
	"DASH/sync-server/lib"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func PingHandler(c *gin.Context) {
	c.JSON(http.StatusOK, map[string]any{
		"message": "pong",
	})
}

type SyncRequest struct {
	BucketName string `json:"bucketName"`
}

func SyncHandler(slaveBucketsData []lib.BucketInfo) gin.HandlerFunc {
	return func(c *gin.Context) {
		// step : 1 -> get bucket name from body
		var syncRequest SyncRequest
		if err := c.ShouldBindJSON(&syncRequest); err != nil {
			c.JSON(http.StatusBadRequest, map[string]any{
				"message": "Invalid request body",
				"error":   err.Error(),
			})
			return
		}
		bucketName := syncRequest.BucketName
		if bucketName == "" {
			c.JSON(http.StatusBadRequest, map[string]any{
				"message": "bucketName is required",
			})
			return
		}

		// cleanup
		defer func() {
			if err := os.RemoveAll("./downloads"); err != nil {
				log.Println("Failed to delete downloads directory", err)
			} else {
				log.Println("Downloads directory deleted")
			}
		}()

		// step : 2 -> download bucket
		if err := lib.DownloadFromBucket(bucketName); err != nil {
			log.Println("Failed to download bucket", err)
			c.JSON(http.StatusInternalServerError, map[string]any{
				"message": "Something went wrong",
				"error":   err.Error(),
			})
			return
		}

		// step : 3 -> upload downloaded folder to slave s3 buckets
		if err := lib.UploadToAllS3Buckets(slaveBucketsData); err != nil {
			log.Println("Failed to upload to slave buckets", err)
			c.JSON(http.StatusInternalServerError, map[string]any{
				"message": "Something went wrong",
				"error":   err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, map[string]any{
			"message": "Sync completed successfully",
		})
	}
}
