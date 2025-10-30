import { getRootDirectories } from '@/lib/r2-client'
import Link from 'next/link'
import { Play } from 'lucide-react'

const HomePage = async () => {
  const directories = await getRootDirectories()
  
  // Format directory name to title (e.g., "supa-strikas" -> "Supa Strikas")
  const formatTitle = (name: string) => {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-6 border-b border-border bg-background/95 backdrop-blur-sm">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Videos</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Browse and watch your video collection
          </p>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {directories.map((directory) => (
            <Link 
              key={directory} 
              href={`/play/${directory}`}
              className="group cursor-pointer"
            >
              <div className="flex flex-col gap-3">
                {/* Thumbnail */}
                <div className="relative aspect-video bg-muted rounded-xl overflow-hidden border border-border shadow-sm group-hover:shadow-md transition-all">
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-linear-to-br from-primary/20 to-destructive/20" />
                  
                  {/* Play icon overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <div className="w-16 h-16 flex items-center justify-center rounded-full bg-destructive shadow-lg">
                      <Play className="w-8 h-8 text-destructive-foreground ml-1" fill="currentColor" />
                    </div>
                  </div>
                  
                  {/* Title overlay at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-linear-to-t from-black/80 to-transparent">
                    <h3 className="text-white text-sm font-medium line-clamp-2">
                      {formatTitle(directory)}
                    </h3>
                  </div>
                </div>

                {/* Video Info */}
                <div className="flex flex-col gap-1 px-1">
                  <h3 className="text-base font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {formatTitle(directory)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Ready to watch
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty state */}
        {directories.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Play className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">No videos yet</h2>
            <p className="text-muted-foreground max-w-md">
              Upload your first video to get started
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default HomePage