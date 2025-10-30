package lib

import (
	"context"
	"fmt"
	"io"
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

// config
const maxConcurrency = 20

type R2Config struct {
	AccountID  string
	AccessKey  string
	SecretKey  string
	BucketName string
	Endpoint   string
}

// CheckDirExists checks if a directory exists, returns error if it doesn't
func CheckDirExists(dirPath string) error {
	info, err := os.Stat(dirPath)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("directory does not exist: %s", dirPath)
		}
		return fmt.Errorf("error checking directory: %w", err)
	}
	if !info.IsDir() {
		return fmt.Errorf("path exists but is not a directory: %s", dirPath)
	}
	return nil
}

// DownloadFromBucket downloads a directory from R2 bucket to ./downloads/
func DownloadFromBucket(remoteDir string) error {
	// 1. Load configuration from environment variables
	cfg, err := loadR2Config()
	if err != nil {
		return fmt.Errorf("failed to load configuration: %w", err)
	}

	// 2. Create the R2 (S3 compatible) client
	s3Client, err := newR2Client(cfg)
	if err != nil {
		return fmt.Errorf("failed to create R2 client: %w", err)
	}

	// 3. Extract the remote directory name and create folder inside ./downloads
	localDir := "./downloads"

	// Remove trailing slashes to get the folder name
	remoteDirName := strings.TrimSuffix(remoteDir, "/")
	// Get the last part of the path (folder name)
	if remoteDirName != "" {
		remoteDirName = filepath.Base(remoteDirName)
	}

	// Create the full local path: ./downloads/remoteDirName
	fullLocalPath := filepath.Join(localDir, remoteDirName)

	// Create local directory if it doesn't exist
	if err := os.MkdirAll(fullLocalPath, 0755); err != nil {
		return fmt.Errorf("failed to create local directory: %w", err)
	}

	log.Printf("Starting download from R2 bucket %s (from %s/) to %s...", cfg.BucketName, remoteDir, fullLocalPath)
	err = DownloadDirectoryFromR2(context.Background(), s3Client, cfg.BucketName, remoteDir, fullLocalPath)
	if err != nil {
		return fmt.Errorf("download failed: %w", err)
	}

	log.Println("[SUCCESS] Download complete!")
	return nil
}

// DownloadDirectoryFromR2 downloads all files from a remote directory to local directory
func DownloadDirectoryFromR2(ctx context.Context, s3Client *s3.Client, bucketName, remotePath, localPath string) error {
	// List all objects with the given prefix
	paginator := s3.NewListObjectsV2Paginator(s3Client, &s3.ListObjectsV2Input{
		Bucket: aws.String(bucketName),
		Prefix: aws.String(remotePath),
	})

	var wg sync.WaitGroup
	sem := make(chan struct{}, maxConcurrency)
	errChan := make(chan error, 1)

	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return fmt.Errorf("failed to list objects: %w", err)
		}

		for _, obj := range page.Contents {
			// Skip if it's a directory marker (ends with /)
			if strings.HasSuffix(*obj.Key, "/") {
				continue
			}

			// Check if there's already an error
			select {
			case err := <-errChan:
				wg.Wait()
				return err
			default:
			}

			sem <- struct{}{}
			wg.Add(1)

			go func(key string) {
				defer wg.Done()
				defer func() { <-sem }()

				err := downloadFile(ctx, s3Client, bucketName, key, remotePath, localPath)
				if err != nil {
					select {
					case errChan <- err:
					default:
					}
				}
			}(*obj.Key)
		}
	}

	wg.Wait()

	select {
	case err := <-errChan:
		return err
	default:
		return nil
	}
}

// downloadFile downloads a single file from R2 to local filesystem
func downloadFile(ctx context.Context, s3Client *s3.Client, bucketName, s3Key, remoteBasePath, localBasePath string) error {
	// Get the relative path by removing the remote base path prefix
	relativePath := strings.TrimPrefix(s3Key, remoteBasePath)
	relativePath = strings.TrimPrefix(relativePath, "/")

	// Create the full local file path
	localFilePath := filepath.Join(localBasePath, relativePath)

	// Create the directory structure if it doesn't exist
	localDir := filepath.Dir(localFilePath)
	if err := os.MkdirAll(localDir, 0755); err != nil {
		return fmt.Errorf("failed to create directory %s: %w", localDir, err)
	}

	// Download the object from R2
	result, err := s3Client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(s3Key),
	})
	if err != nil {
		return fmt.Errorf("failed to download %s: %w", s3Key, err)
	}
	defer result.Body.Close()

	// Create the local file
	file, err := os.Create(localFilePath)
	if err != nil {
		return fmt.Errorf("failed to create file %s: %w", localFilePath, err)
	}
	defer file.Close()

	// Copy the content
	_, err = io.Copy(file, result.Body)
	if err != nil {
		return fmt.Errorf("failed to write file %s: %w", localFilePath, err)
	}

	log.Printf("Downloaded: %s -> %s", s3Key, localFilePath)
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
