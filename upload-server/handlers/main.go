package handlers

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

func WelcomeHandler(c *gin.Context) {
	c.JSON(http.StatusOK, map[string]any{
		"message": "Welcome to the upload server",
	})
}

func PingHandler(c *gin.Context) {
	c.JSON(http.StatusOK, map[string]any{
		"message": "pong",
	})
}

func UploadHandler(c *gin.Context) {
	start := time.Now()
	// step : 1 -> get video, title from form body
	file, err := c.FormFile("video")
	if err != nil {
		log.Println("Failed to get video from form body", err)
		c.JSON(http.StatusBadRequest, map[string]any{
			"message": "Failed to get video from form body",
			"error":   err.Error(),
		})
		return
	}
	title := c.PostForm("title")

	// step : 2 -> log some file info
	log.Println("File name:", file.Filename)
	log.Println("File size:", file.Size)
	log.Println("File header:", file.Header)

	// step : 3 -> create upload directory if it doesn't exist
	uploadDir := "./uploads"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		log.Println("Failed to create upload directory", err)
		c.JSON(http.StatusInternalServerError, map[string]any{
			"message": "Something went wrong",
			"error":   err.Error(),
		})
		return
	}

	// step : 4 -> save video to local storage
	fileName := ""
	if title != "" {
		fileName = title + ".mp4"
	} else {
		fileName = file.Filename
	}

	filePath := filepath.Join(uploadDir, fileName)
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		log.Println("Failed to save video to local storage", err)
		c.JSON(http.StatusInternalServerError, map[string]any{
			"message": "Something went wrong",
			"error":   err.Error(),
		})
		return
	}

	// step : 5 -> run ffmpeg to create .ts files

	// step : 5 -> return success response
	elapsed := time.Since(start)
	c.JSON(http.StatusOK, map[string]any{
		"message":  "Video uploaded successfully",
		"filePath": filePath,
		"elapsed":  elapsed.Seconds(),
	})
}
