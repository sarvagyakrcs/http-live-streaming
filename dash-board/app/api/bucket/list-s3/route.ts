import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { getS3Client } from "@/lib/r2-client";

export async function POST(request: Request) {
  try {
    const { bucketName, region } = await request.json();

    if (!bucketName || !region) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing bucketName or region",
        },
        { status: 400 }
      );
    }

    const client = getS3Client(region);

    const command = new ListObjectsV2Command({
      Bucket: bucketName,
    });

    const response = await client.send(command);

    return NextResponse.json({
      success: true,
      objects: response.Contents || [],
      count: response.KeyCount || 0,
    });
  } catch (error) {
    console.error("Error listing S3 objects:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list objects",
      },
      { status: 500 }
    );
  }
}

