package lib

import (
	"context"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

const maxS3Concurrency = 20

type S3Config struct {
	AccessKey  string
	SecretKey  string
	Region     string
	BucketName string
}

type BucketInfo struct {
	Region     string
	BucketName string
}

// CheckBucketExists checks if a bucket exists in the specified region
func CheckBucketExists(ctx context.Context, bucketName, region string) error {
	cfg, err := loadS3Config(region)
	if err != nil {
		return fmt.Errorf("failed to load S3 configuration: %w", err)
	}

	s3Client, err := newS3Client(cfg)
	if err != nil {
		return fmt.Errorf("failed to create S3 client: %w", err)
	}

	// Try to get bucket location to verify it exists
	_, err = s3Client.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(bucketName),
	})

	if err != nil {
		return fmt.Errorf("bucket '%s' does not exist or is not accessible in region '%s': %w", bucketName, region, err)
	}

	log.Printf("✓ Bucket '%s' exists in region '%s'", bucketName, region)
	return nil
}

// UploadToAllS3Buckets uploads the first folder from ./downloads to all S3 buckets
func UploadToAllS3Buckets(buckets []BucketInfo) error {
	// 1. Check if environment variables are set
	accessKey := GetEnv("AWS_ACCESS_KEY_ID")
	secretKey := GetEnv("AWS_SECRET_ACCESS_KEY")

	if accessKey == "" || secretKey == "" {
		return fmt.Errorf("AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set")
	}

	// 2. Get the first folder from ./downloads
	downloadsDir := ".//downloads"
	if err := CheckDirExists(downloadsDir); err != nil {
		return fmt.Errorf("downloads directory does not exist: %w", err)
	}

	entries, err := os.ReadDir(downloadsDir)
	if err != nil {
		return fmt.Errorf("failed to read downloads directory: %w", err)
	}

	var firstFolder string
	for _, entry := range entries {
		if entry.IsDir() {
			firstFolder = entry.Name()
			break
		}
	}

	if firstFolder == "" {
		return fmt.Errorf("no folders found in %s", downloadsDir)
	}

	localFolderPath := filepath.Join(downloadsDir, firstFolder)
	log.Printf("Found folder to upload: %s", firstFolder)

	// 3. Check if all buckets exist
	log.Println("\n=== Checking if all buckets exist ===")
	for _, bucket := range buckets {
		if err := CheckBucketExists(context.Background(), bucket.BucketName, bucket.Region); err != nil {
			return err
		}
	}
	log.Println("✓ All buckets are accessible")

	// 4. Upload to all buckets
	log.Println("=== Starting uploads to all buckets ===")
	var uploadErrors []string
	var mu sync.Mutex

	var wg sync.WaitGroup
	for _, bucket := range buckets {
		wg.Add(1)
		go func(b BucketInfo) {
			defer wg.Done()

			err := uploadDirectoryToS3(context.Background(), b.Region, b.BucketName, localFolderPath, firstFolder)

			mu.Lock()
			defer mu.Unlock()

			if err != nil {
				errMsg := fmt.Sprintf("Failed to upload to bucket '%s' in region '%s': %v", b.BucketName, b.Region, err)
				uploadErrors = append(uploadErrors, errMsg)
				log.Printf("✗ %s", errMsg)
			} else {
				log.Printf("✓ Successfully uploaded to bucket '%s' in region '%s'", b.BucketName, b.Region)
			}
		}(bucket)
	}

	wg.Wait()

	// 5. Check if there were any errors
	if len(uploadErrors) > 0 {
		return fmt.Errorf("upload failed for %d bucket(s):\n%s", len(uploadErrors), strings.Join(uploadErrors, "\n"))
	}

	log.Println("\n[SUCCESS] All uploads completed successfully!")
	return nil
}

// uploadDirectoryToS3 uploads a directory to an S3 bucket
func uploadDirectoryToS3(ctx context.Context, region, bucketName, localPath, remotePath string) error {
	cfg, err := loadS3Config(region)
	if err != nil {
		return err
	}
	cfg.BucketName = bucketName

	s3Client, err := newS3Client(cfg)
	if err != nil {
		return err
	}

	var wg sync.WaitGroup
	sem := make(chan struct{}, maxS3Concurrency)
	errChan := make(chan error, 1)

	err = filepath.WalkDir(localPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}

		select {
		case err := <-errChan:
			return err
		default:
		}

		sem <- struct{}{}
		wg.Add(1)

		go func(filePath string) {
			defer wg.Done()
			defer func() { <-sem }()

			err := uploadFileToS3(ctx, s3Client, bucketName, localPath, filePath, remotePath)
			if err != nil {
				select {
				case errChan <- err:
				default:
				}
			}
		}(path)

		return nil
	})

	wg.Wait()

	select {
	case err := <-errChan:
		return err
	default:
		return err
	}
}

// uploadFileToS3 uploads a single file to S3
func uploadFileToS3(ctx context.Context, s3Client *s3.Client, bucketName, localBasePath, filePath, remoteBasePath string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open file %s: %w", filePath, err)
	}
	defer file.Close()

	// Get the relative path
	relativePath, err := filepath.Rel(localBasePath, filePath)
	if err != nil {
		return fmt.Errorf("failed to create relative path for %s: %w", filePath, err)
	}

	// Convert to forward slashes for S3
	relativePath = filepath.ToSlash(relativePath)

	// Create S3 key: remoteBasePath/relativePath
	s3Key := remoteBasePath + "/" + relativePath

	// Get file info for content type
	contentType := getS3ContentType(filePath)

	// Upload to S3
	_, err = s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(bucketName),
		Key:         aws.String(s3Key),
		Body:        file,
		ContentType: aws.String(contentType),
	})

	if err != nil {
		return fmt.Errorf("failed to upload %s: %w", s3Key, err)
	}

	return nil
}

// loadS3Config loads S3 configuration from environment variables
func loadS3Config(region string) (*S3Config, error) {
	cfg := &S3Config{
		AccessKey: GetEnv("AWS_ACCESS_KEY_ID"),
		SecretKey: GetEnv("AWS_SECRET_ACCESS_KEY"),
		Region:    region,
	}

	if cfg.AccessKey == "" || cfg.SecretKey == "" {
		return nil, fmt.Errorf("AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set")
	}

	return cfg, nil
}

// newS3Client creates a new S3 client
func newS3Client(cfg *S3Config) (*s3.Client, error) {
	awsCfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.AccessKey, cfg.SecretKey, "")),
		config.WithRegion(cfg.Region),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	s3Client := s3.NewFromConfig(awsCfg)
	return s3Client, nil
}

// getS3ContentType returns the content type for a file
func getS3ContentType(filePath string) string {
	ext := filepath.Ext(filePath)
	switch ext {
	case ".m3u8":
		return "application/vnd.apple.mpegurl"
	case ".ts":
		return "video/mp2t"
	case ".mp4":
		return "video/mp4"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".mpd":
		return "application/dash+xml"
	default:
		return "application/octet-stream"
	}
}
