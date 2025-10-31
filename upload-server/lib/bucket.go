package lib

import (
	"context"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path"
	"path/filepath"
	"sync"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// config
const maxConcurrency = 20

type R2Config struct {
	AccountID  string
	AccessKey  string
	SecretKey  string
	BucketName string
	Endpoint   string
}

func UploadOutToBucket(remoteUploadDir string) bool {
	// 1. Load configuration from environment variables
	cfg, err := loadR2Config()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// 2. Create the R2 (S3 compatible) client
	s3Client, err := newR2Client(cfg)
	if err != nil {
		log.Fatalf("Failed to create R2 client: %v", err)
	}

	// 3. Define the directories
	localUploadDir := "./output"
	log.Printf("Starting upload from %s to R2 bucket %s (at %s/)...", localUploadDir, cfg.BucketName, remoteUploadDir)
	err = UploadDirectoryToR2(context.Background(), s3Client, cfg.BucketName, localUploadDir, remoteUploadDir)
	if err != nil {
		log.Fatalf("Upload failed: %v", err)
	}

	log.Println("[SUCCESS] Upload complete!")
	return true
}

func UploadDirectoryToR2(ctx context.Context, s3Client *s3.Client, bucketName, localPath, remotePath string) error {
	var wg sync.WaitGroup
	sem := make(chan struct{}, maxConcurrency)
	errChan := make(chan error, 1)

	err := filepath.WalkDir(localPath, func(path string, d fs.DirEntry, err error) error {
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

			// Pass the remotePath to uploadFile
			err := uploadFile(ctx, s3Client, bucketName, localPath, filePath, remotePath)
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

func uploadFile(ctx context.Context, s3Client *s3.Client, bucketName, localBasePath, filePath, remoteBasePath string) error {
	// 1. Open the local file
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open file %s: %w", filePath, err)
	}
	defer file.Close()

	// 2. Determine the S3 Key (path in the bucket)
	// Get the relative path (e.g., "stream_0/data001.ts")
	relativePath, err := filepath.Rel(localBasePath, filePath)
	if err != nil {
		return fmt.Errorf("failed to create relative path for %s: %w", filePath, err)
	}
	// S3 uses forward slashes, even on Windows
	relativePath = filepath.ToSlash(relativePath)

	// *** THIS IS THE CHANGE ***
	// Prepend the remote base directory to the relative path
	// (e.g., "suit-yourself" + "stream_0/data001.ts" -> "suit-yourself/stream_0/data001.ts")
	// We use path.Join as it correctly handles forward slashes for URLs/S3 keys.
	s3Key := path.Join(remoteBasePath, relativePath)

	// 3. Determine the Content-Type (MIME Type)
	contentType := getContentType(filePath)

	// 4. Upload the file
	_, err = s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(bucketName),
		Key:         aws.String(s3Key),
		Body:        file,
		ContentType: aws.String(contentType),
	})

	if err != nil {
		return fmt.Errorf("failed to upload %s: %w", s3Key, err)
	}

	log.Printf("Uploaded: %s", s3Key)
	return nil
}

func loadR2Config() (*R2Config, error) {
	cfg := &R2Config{
		AccountID:  GetEnv("R2_ACCOUNT_ID"),
		AccessKey:  GetEnv("R2_ACCESS_KEY_ID"),
		SecretKey:  GetEnv("R2_SECRET_ACCESS_KEY"),
		BucketName: GetEnv("R2_BUCKET_NAME"),
	}

	if cfg.AccountID == "" || cfg.AccessKey == "" || cfg.SecretKey == "" || cfg.BucketName == "" {
		return nil, fmt.Errorf("R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME must be set")
	}

	cfg.Endpoint = fmt.Sprintf("https://%s.r2.cloudflarestorage.com", cfg.AccountID)
	return cfg, nil
}

func newR2Client(cfg *R2Config) (*s3.Client, error) {
	resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL:           cfg.Endpoint,
			PartitionID:   "aws",
			SigningName:   "s3",
			SigningRegion: "auto",
		}, nil
	})

	awsCfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithEndpointResolverWithOptions(resolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.AccessKey, cfg.SecretKey, "")),
		config.WithRegion("auto"),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load aws config: %w", err)
	}

	s3Client := s3.NewFromConfig(awsCfg)
	return s3Client, nil
}

func getContentType(filePath string) string {
	ext := filepath.Ext(filePath)
	switch ext {
	case ".m3u8":
		return "application/vnd.apple.mpegurl"
	case ".ts":
		return "video/mp2t"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	default:
		return "application/octet-stream"
	}
}
