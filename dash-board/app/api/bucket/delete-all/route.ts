import {
  ListObjectsV2Command,
  DeleteObjectsCommand,
  _Object,
} from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { getR2Client, getBucketName } from "@/lib/r2-client";

export async function DELETE() {
  try {
    const client = getR2Client();
    const bucketName = getBucketName();

    // List all objects
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
    });

    const listResponse = await client.send(listCommand);

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No objects to delete",
        deletedCount: 0,
      });
    }

    // Delete all objects
    const objectsToDelete = listResponse.Contents.map((obj: _Object) => ({
      Key: obj.Key!,
    }));

    const deleteCommand = new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: objectsToDelete,
        Quiet: false,
      },
    });

    const deleteResponse = await client.send(deleteCommand);

    return NextResponse.json({
      success: true,
      message: "All objects deleted successfully",
      deletedCount: deleteResponse.Deleted?.length || 0,
      deleted: deleteResponse.Deleted || [],
      errors: deleteResponse.Errors || [],
    });
  } catch (error) {
    console.error("Error deleting objects:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete objects",
      },
      { status: 500 }
    );
  }
}

