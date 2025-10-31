"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, RefreshCw, Loader2, Folder, File, ChevronRight, Home, Database, Cloud } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { SlaveS3Buckets } from "@/config";

interface BucketObject {
  Key: string;
  LastModified: string;
  Size: number;
}

type BucketType = "r2-master" | "s3-slave";

interface BucketConfig {
  id: string;
  name: string;
  type: BucketType;
  region?: string;
  bucketName?: string;
}

const BucketManager = () => {
  // Create bucket configurations
  const buckets: BucketConfig[] = useMemo(() => [
    {
      id: "r2-master",
      name: "R2 Master",
      type: "r2-master",
    },
    ...SlaveS3Buckets.map((bucket, index) => ({
      id: `s3-${index}`,
      name: `S3 - ${bucket.Region}`,
      type: "s3-slave" as BucketType,
      region: bucket.Region,
      bucketName: bucket.BucketName,
    })),
  ], []);

  const [activeBucket, setActiveBucket] = useState<string>(buckets[0].id);
  const [bucketData, setBucketData] = useState<Record<string, BucketObject[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>("");

  const getCurrentBucket = () => buckets.find(b => b.id === activeBucket)!;
  const currentObjects = bucketData[activeBucket] || [];

  const fetchObjects = useCallback(async (bucketId?: string) => {
    const targetBucket = bucketId || activeBucket;
    const bucket = buckets.find(b => b.id === targetBucket)!;
    
    setLoading(prev => ({ ...prev, [targetBucket]: true }));
    
    try {
      let response;
      
      if (bucket.type === "r2-master") {
        response = await fetch("/api/bucket/list");
      } else {
        response = await fetch("/api/bucket/list-s3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bucketName: bucket.bucketName,
            region: bucket.region,
          }),
        });
      }
      
      const data = await response.json();

      if (data.success) {
        setBucketData(prev => ({ ...prev, [targetBucket]: data.objects }));
      } else {
        toast.error(data.error || "Failed to fetch objects");
      }
    } catch {
      toast.error("Failed to connect to the server");
    } finally {
      setLoading(prev => ({ ...prev, [targetBucket]: false }));
    }
  }, [activeBucket, buckets]);

  const deleteAllObjects = async () => {
    const bucket = getCurrentBucket();
    setDeleting(true);
    
    try {
      let response;
      
      if (bucket.type === "r2-master") {
        response = await fetch("/api/bucket/delete-all", {
          method: "DELETE",
        });
      } else {
        response = await fetch("/api/bucket/delete-all-s3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bucketName: bucket.bucketName,
            region: bucket.region,
          }),
        });
      }
      
      const data = await response.json();

      if (data.success) {
        toast.success(`Successfully deleted ${data.deletedCount} object(s)`);
        setBucketData(prev => ({ ...prev, [activeBucket]: [] }));
      } else {
        toast.error(data.error || "Failed to delete objects");
      }
    } catch {
      toast.error("Failed to connect to the server");
    } finally {
      setDeleting(false);
    }
  };

  // Fetch objects for active bucket when it changes
  useEffect(() => {
    if (!bucketData[activeBucket]) {
      fetchObjects(activeBucket);
    }
    // Reset path when switching buckets
    setCurrentPath("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBucket]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  // Get directory structure from current path
  const getDirectoriesAndFiles = () => {
    const filteredObjects = currentObjects.filter(obj => 
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
  const totalSize = currentObjects.reduce((acc, obj) => acc + obj.Size, 0);
  const currentBucket = getCurrentBucket();
  const isCurrentLoading = loading[activeBucket] || false;

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border/50 bg-gradient-to-br from-background via-background to-muted/20">
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-start justify-between mb-8">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                Storage Manager
              </h1>
              <p className="text-sm text-muted-foreground/80">
                Manage your R2 and S3 buckets across multiple regions
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => fetchObjects()}
                disabled={isCurrentLoading}
                variant="outline"
                size="sm"
                className="h-9 shadow-sm hover:shadow-md transition-all hover:border-primary/50 hover:bg-primary/5"
              >
                {isCurrentLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2 font-medium">Refresh</span>
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={deleting || currentObjects.length === 0}
                    variant="outline"
                    size="sm"
                    className="h-9 shadow-sm hover:shadow-md transition-all border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive disabled:opacity-50"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span className="ml-2 font-medium">Delete All</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all{" "}
                      <strong>{currentObjects.length}</strong> object(s) from{" "}
                      <strong>{currentBucket.name}</strong>.
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

          {/* Bucket Tabs */}
          <Tabs value={activeBucket} onValueChange={setActiveBucket} className="w-full">
            <TabsList className="h-11 bg-muted/40 backdrop-blur-sm border border-border/60 p-1 shadow-inner w-fit">
              {buckets.map((bucket) => (
                <TabsTrigger
                  key={bucket.id}
                  value={bucket.id}
                  className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-md h-9 px-4"
                >
                  <div className={`p-1 rounded-md ${
                    bucket.type === "r2-master" 
                      ? "bg-primary/10 text-primary" 
                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  }`}>
                    {bucket.type === "r2-master" ? (
                      <Database className="h-3.5 w-3.5" />
                    ) : (
                      <Cloud className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold">{bucket.name}</span>
                    {bucket.region && (
                      <span className="text-[10px] text-muted-foreground font-mono leading-none">
                        {bucket.region}
                      </span>
                    )}
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="group relative bg-gradient-to-br from-card via-card to-primary/5 border border-border/60 rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground/80 mb-2 uppercase tracking-wider">Total Objects</p>
                  <p className="text-2xl font-bold text-foreground">{currentObjects.length.toLocaleString()}</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <File className="h-4 w-4 text-primary" />
                </div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-card via-card to-blue-500/5 border border-border/60 rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:border-blue-500/30 hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground/80 mb-2 uppercase tracking-wider">Total Size</p>
                  <p className="text-2xl font-bold text-foreground">{formatBytes(totalSize)}</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-card via-card to-purple-500/5 border border-border/60 rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:border-purple-500/30 hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground/80 mb-2 uppercase tracking-wider">Bucket Type</p>
                  <div className="flex items-center gap-2">
                    {currentBucket.type === "r2-master" ? (
                      <>
                        <span className="text-2xl font-bold text-foreground">Master</span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-foreground">Slave</span>
                      </>
                    )}
                  </div>
                </div>
                <div className={`p-2 rounded-lg transition-colors ${
                  currentBucket.type === "r2-master" 
                    ? "bg-purple-500/10 group-hover:bg-purple-500/20" 
                    : "bg-orange-500/10 group-hover:bg-orange-500/20"
                }`}>
                  {currentBucket.type === "r2-master" ? (
                    <Database className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  ) : (
                    <Cloud className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  )}
                </div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-card via-card to-emerald-500/5 border border-border/60 rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:border-emerald-500/30 hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground/80 mb-2 uppercase tracking-wider">
                    {currentBucket.region ? "Region" : "Bucket"}
                  </p>
                  <p className="text-lg font-bold text-foreground font-mono">
                    {currentBucket.region || currentBucket.bucketName || "R2"}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                  <Cloud className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Browser - Scrollable */}
      <div className="flex-1 overflow-hidden px-8 pb-8">
        <div className="h-full bg-gradient-to-br from-card via-card to-muted/10 border border-border/60 rounded-2xl overflow-hidden shadow-xl flex flex-col mt-6">
          {/* Breadcrumb Navigation */}
          <div className="shrink-0 px-6 py-4 border-b border-border/60 bg-gradient-to-r from-muted/30 via-muted/20 to-transparent backdrop-blur-sm">
            <div className="flex items-center gap-1 text-sm overflow-x-auto">
              <button
                onClick={() => navigateToPath('')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-background/80 transition-all text-muted-foreground hover:text-foreground font-semibold whitespace-nowrap shadow-sm hover:shadow-md"
              >
                <Home className="h-4 w-4" />
                <span>Root</span>
              </button>
              {breadcrumbs.map((crumb) => (
                <React.Fragment key={crumb.path}>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  <button
                    onClick={() => navigateToPath(crumb.path)}
                    className="px-3 py-1.5 rounded-lg hover:bg-background/80 transition-all text-muted-foreground hover:text-foreground font-semibold whitespace-nowrap shadow-sm hover:shadow-md"
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Content Area - Scrollable */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-background/40 to-background/80 px-3 py-3">
            {isCurrentLoading ? (
              <div className="flex flex-col items-center justify-center py-32 px-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"></div>
                  <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
                </div>
                <p className="text-sm font-medium text-foreground mt-6">Loading {currentBucket.name}...</p>
                <p className="text-xs text-muted-foreground mt-1">Please wait</p>
              </div>
            ) : currentObjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 px-4">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-muted/30 blur-3xl rounded-full"></div>
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-2 border-border/60 flex items-center justify-center relative shadow-lg">
                    <Folder className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                </div>
                <p className="text-base font-semibold text-foreground mb-2">No Items Found</p>
                <p className="text-sm text-muted-foreground">This bucket is empty</p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 px-4">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-muted/30 blur-3xl rounded-full"></div>
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-2 border-border/60 flex items-center justify-center relative shadow-lg">
                    <Folder className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                </div>
                <p className="text-base font-semibold text-foreground mb-2">No Items Found</p>
                <p className="text-sm text-muted-foreground">This folder is empty</p>
              </div>
            ) : (
              <div className="space-y-1 p-1">
                {items.map((item) => (
                  <div
                    key={item.path}
                    className={`group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                      item.type === 'folder'
                        ? 'cursor-pointer hover:bg-primary/5 hover:shadow-md active:scale-[0.98] border border-transparent hover:border-primary/20'
                        : 'hover:bg-muted/30 border border-transparent hover:border-border/60'
                    }`}
                    onClick={() => item.type === 'folder' && navigateToPath(item.path)}
                  >
                    {/* Icon */}
                    <div className="shrink-0">
                      {item.type === 'folder' ? (
                        <div className="relative">
                          <svg className="w-9 h-9 drop-shadow-sm" viewBox="0 0 32 32" fill="none">
                            <path
                              d="M4 8C4 6.89543 4.89543 6 6 6H12.5858C13.1162 6 13.6249 6.21071 14 6.58579L16.4142 9H26C27.1046 9 28 9.89543 28 11V24C28 25.1046 27.1046 26 26 26H6C4.89543 26 4 25.1046 4 24V8Z"
                              className="fill-primary/15 group-hover:fill-primary/25 transition-colors"
                            />
                            <path
                              d="M4 8C4 6.89543 4.89543 6 6 6H12.5858C13.1162 6 13.6249 6.21071 14 6.58579L16.4142 9H26C27.1046 9 28 9.89543 28 11V12H4V8Z"
                              className="fill-primary/30 group-hover:fill-primary/45 transition-colors"
                            />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-background to-muted/30 border border-border/60 flex items-center justify-center group-hover:border-primary/30 group-hover:shadow-sm transition-all">
                          <File className="h-4 w-4 text-muted-foreground group-hover:text-primary/70" />
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0 flex items-center gap-6">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary/90 transition-colors">
                          {item.name}
                        </p>
                      </div>
                      
                      {item.obj && (
                        <>
                          <div className="hidden sm:block text-xs text-muted-foreground/80 font-semibold w-24 text-right tabular-nums">
                            {formatBytes(item.obj.Size)}
                          </div>
                          <div className="hidden lg:block text-xs text-muted-foreground/70 w-36 text-right font-medium">
                            {new Date(item.obj.LastModified).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </>
                      )}
                      
                      {item.type === 'folder' && (
                        <div className="hidden sm:block text-xs text-muted-foreground/40 w-24 text-right font-medium">
                          Folder
                        </div>
                      )}
                    </div>

                    {/* Chevron for folders */}
                    {item.type === 'folder' && (
                      <div className="p-1.5 rounded-lg bg-primary/0 group-hover:bg-primary/10 transition-colors">
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary/70 transition-colors shrink-0" />
                      </div>
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