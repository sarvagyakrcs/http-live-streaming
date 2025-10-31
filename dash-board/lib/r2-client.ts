import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

export function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing R2 credentials in environment variables");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export function getS3Client(region: string) {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Missing AWS credentials in environment variables");
  }

  return new S3Client({
    region: region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export function getBucketName() {
  const bucketName = process.env.R2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("Missing R2_BUCKET_NAME in environment variables");
  }
  return bucketName;
}

export async function getRootDirectories(): Promise<string[]> {
  const client = getR2Client();
  const bucketName = getBucketName();

  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Delimiter: "/", // This gets only root-level directories
    Prefix: "",
  });

  const response = await client.send(command);

  // CommonPrefixes contains the directory names
  const directories = response.CommonPrefixes?.map((prefix) => {
    // Remove trailing slash from directory name
    return prefix.Prefix?.replace(/\/$/, "") || "";
  }).filter(Boolean) || [];

  return directories;
}
