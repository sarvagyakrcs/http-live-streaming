import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { getR2Client, getBucketName } from "@/lib/r2-client";

export async function GET() {
  try {
    const client = getR2Client();
    const bucketName = getBucketName();

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
    console.error("Error listing objects:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list objects",
      },
      { status: 500 }
    );
  }
}

