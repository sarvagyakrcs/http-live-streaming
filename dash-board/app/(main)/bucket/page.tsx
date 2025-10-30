"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, RefreshCw, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BucketObject {
  Key: string;
  LastModified: string;
  Size: number;
}

const BucketManager = () => {
  const [objects, setObjects] = useState<BucketObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchObjects = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/bucket/list");
      const data = await response.json();

      if (data.success) {
        setObjects(data.objects);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to fetch objects" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to connect to the server" });
    } finally {
      setLoading(false);
    }
  };

  const deleteAllObjects = async () => {
    setDeleting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/bucket/delete-all", {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: `Successfully deleted ${data.deletedCount} object(s)`,
        });
        setObjects([]);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to delete objects" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to connect to the server" });
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchObjects();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>R2 Bucket Manager</span>
            <div className="flex gap-2">
              <Button
                onClick={fetchObjects}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Refresh</span>
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={deleting || objects.length === 0}
                    variant="destructive"
                    size="sm"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span className="ml-2">Delete All</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all{" "}
                      <strong>{objects.length}</strong> object(s) from your R2 bucket.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={deleteAllObjects}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardTitle>
          <CardDescription>
            Manage objects in your Cloudflare R2 bucket
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message && (
            <Alert
              variant={message.type === "error" ? "destructive" : "default"}
              className="mb-4"
            >
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">
                Total objects: <strong>{objects.length}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Total size:{" "}
                <strong>
                  {formatBytes(objects.reduce((acc, obj) => acc + obj.Size, 0))}
                </strong>
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : objects.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No objects found in the bucket
              </div>
            ) : (
              <div className="border rounded-lg">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Key</th>
                        <th className="text-left p-3 text-sm font-medium">Size</th>
                        <th className="text-left p-3 text-sm font-medium">
                          Last Modified
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {objects.map((obj, index) => (
                        <tr
                          key={obj.Key}
                          className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}
                        >
                          <td className="p-3 text-sm font-mono">{obj.Key}</td>
                          <td className="p-3 text-sm">{formatBytes(obj.Size)}</td>
                          <td className="p-3 text-sm">
                            {new Date(obj.LastModified).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BucketManager;