"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, RefreshCw, Loader2, Folder, File, ChevronRight, Home } from "lucide-react";
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
import { toast } from "sonner";

interface BucketObject {
  Key: string;
  LastModified: string;
  Size: number;
}

const BucketManager = () => {
  const [objects, setObjects] = useState<BucketObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>("");

  const fetchObjects = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/bucket/list");
      const data = await response.json();

      if (data.success) {
        setObjects(data.objects);
      } else {
        toast.error(data.error || "Failed to fetch objects");
      }
    } catch {
      toast.error("Failed to connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const deleteAllObjects = async () => {
    setDeleting(true);
    try {
      const response = await fetch("/api/bucket/delete-all", {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        toast.success(`Successfully deleted ${data.deletedCount} object(s)`);
        setObjects([]);
      } else {
        toast.error(data.error || "Failed to delete objects");
      }
    } catch {
      toast.error("Failed to connect to the server");
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

  // Get directory structure from current path
  const getDirectoriesAndFiles = () => {
    const filteredObjects = objects.filter(obj => 
      currentPath ? obj.Key.startsWith(currentPath) : true
    );

    const items: { type: 'folder' | 'file'; name: string; path: string; obj?: BucketObject }[] = [];
    const seenFolders = new Set<string>();

    filteredObjects.forEach(obj => {
      const relativePath = currentPath ? obj.Key.slice(currentPath.length) : obj.Key;
      const parts = relativePath.split('/').filter(Boolean);
      
      if (parts.length > 1) {
        // It's in a subfolder
        const folderName = parts[0];
        const folderPath = currentPath + folderName + '/';
        if (!seenFolders.has(folderName)) {
          seenFolders.add(folderName);
          items.push({ type: 'folder', name: folderName, path: folderPath });
        }
      } else if (parts.length === 1) {
        // It's a file in current directory
        items.push({ type: 'file', name: parts[0], path: obj.Key, obj });
      }
    });

    return items.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });
  };

  const navigateToPath = (path: string) => {
    setCurrentPath(path);
  };

  const getBreadcrumbs = () => {
    if (!currentPath) return [];
    const parts = currentPath.split('/').filter(Boolean);
    const breadcrumbs: { name: string; path: string }[] = [];
    let accumulatedPath = '';
    
    parts.forEach(part => {
      accumulatedPath += part + '/';
      breadcrumbs.push({ name: part, path: accumulatedPath });
    });
    
    return breadcrumbs;
  };

  const items = getDirectoriesAndFiles();
  const breadcrumbs = getBreadcrumbs();
  const totalSize = objects.reduce((acc, obj) => acc + obj.Size, 0);

  return (
    <div className="h-full w-full flex flex-col p-6">
      {/* Header */}
      <div className="shrink-0 px-6 py-6 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Bucket Storage</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Browse and manage your R2 bucket contents</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={fetchObjects}
              disabled={loading}
              variant="outline"
              size="sm"
              className="h-9 transition-all hover:border-primary/40"
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
                  variant="outline"
                  size="sm"
                  className="h-9 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50 transition-all disabled:opacity-50"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span className="ml-2">Delete All</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border">
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
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-card border border-border rounded-lg p-3 transition-all duration-200 hover:shadow-sm hover:border-primary/20">
            <p className="text-xs font-medium text-muted-foreground mb-1">Total Objects</p>
            <p className="text-xl font-semibold text-foreground">{objects.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 transition-all duration-200 hover:shadow-sm hover:border-primary/20">
            <p className="text-xs font-medium text-muted-foreground mb-1">Total Size</p>
            <p className="text-xl font-semibold text-foreground">{formatBytes(totalSize)}</p>
          </div>
        </div>
      </div>

      {/* File Browser - Scrollable */}
      <div className="flex-1 overflow-hidden px-6 pb-6">
        <div className="h-full bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col mt-6">
          {/* Breadcrumb Navigation */}
          <div className="shrink-0 px-6 py-3 border-b border-border bg-muted/40 backdrop-blur-sm">
            <div className="flex items-center gap-0.5 text-sm overflow-x-auto">
              <button
                onClick={() => navigateToPath('')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-background/60 transition-all text-muted-foreground hover:text-foreground font-medium whitespace-nowrap"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Root</span>
              </button>
              {breadcrumbs.map((crumb) => (
                <React.Fragment key={crumb.path}>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                  <button
                    onClick={() => navigateToPath(crumb.path)}
                    className="px-2.5 py-1 rounded-md hover:bg-background/60 transition-all text-muted-foreground hover:text-foreground font-medium whitespace-nowrap"
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Content Area - Scrollable */}
          <div className="flex-1 overflow-y-auto bg-background/30 px-2 py-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 px-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : objects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 px-4">
                <div className="w-20 h-20 rounded-2xl bg-muted/50 backdrop-blur-sm border border-border flex items-center justify-center mb-4">
                  <Folder className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No Items</p>
                <p className="text-xs text-muted-foreground">This folder is empty</p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 px-4">
                <div className="w-20 h-20 rounded-2xl bg-muted/50 backdrop-blur-sm border border-border flex items-center justify-center mb-4">
                  <Folder className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No Items</p>
                <p className="text-xs text-muted-foreground">This folder is empty</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {items.map((item, index) => (
                  <div
                    key={item.path}
                    className={`group flex items-center gap-4 px-5 py-3.5 transition-all duration-150 ${
                      item.type === 'folder'
                        ? 'cursor-pointer hover:bg-accent/40 active:bg-accent/60'
                        : 'hover:bg-accent/20'
                    } ${index === 0 ? 'border-t-0' : ''}`}
                    onClick={() => item.type === 'folder' && navigateToPath(item.path)}
                  >
                    {/* Icon */}
                    <div className="shrink-0">
                      {item.type === 'folder' ? (
                        <div className="relative">
                          <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
                            <path
                              d="M4 8C4 6.89543 4.89543 6 6 6H12.5858C13.1162 6 13.6249 6.21071 14 6.58579L16.4142 9H26C27.1046 9 28 9.89543 28 11V24C28 25.1046 27.1046 26 26 26H6C4.89543 26 4 25.1046 4 24V8Z"
                              className="fill-primary/20 group-hover:fill-primary/30 transition-colors"
                            />
                            <path
                              d="M4 8C4 6.89543 4.89543 6 6 6H12.5858C13.1162 6 13.6249 6.21071 14 6.58579L16.4142 9H26C27.1046 9 28 9.89543 28 11V12H4V8Z"
                              className="fill-primary/40 group-hover:fill-primary/50 transition-colors"
                            />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-background border border-border/60 flex items-center justify-center group-hover:border-border transition-colors">
                          <File className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0 flex items-center gap-6">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.name}
                        </p>
                      </div>
                      
                      {item.obj && (
                        <>
                          <div className="hidden sm:block text-xs text-muted-foreground font-medium w-24 text-right">
                            {formatBytes(item.obj.Size)}
                          </div>
                          <div className="hidden lg:block text-xs text-muted-foreground w-36 text-right">
                            {new Date(item.obj.LastModified).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </>
                      )}
                      
                      {item.type === 'folder' && (
                        <div className="hidden sm:block text-xs text-muted-foreground/60 w-24 text-right">
                          —
                        </div>
                      )}
                    </div>

                    {/* Chevron for folders */}
                    {item.type === 'folder' && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BucketManager;