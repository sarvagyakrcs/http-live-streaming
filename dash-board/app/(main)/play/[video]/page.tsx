import { VideoPlayer } from "@/components/task/player/VideoPlayer"
import { baseUrls } from "@/config"

type Props = {
    params: Promise<{ video: string }>
}
const BASE_URL = baseUrls.videoServer

const PlayPage = async ({ params }: Props) => {
    const { video: videoName } = await params
    
    // Decode URL-encoded name (e.g., "I%20really%20do" -> "I really do")
    const decodedVideoName = decodeURIComponent(videoName)
    
    // Construct the full HLS URL from video name
    const hlsUrl = `${BASE_URL}/${videoName}/master.m3u8`
    
    // Format title from video name (e.g., "supa-strikas" -> "Supa Strikas")
    const title = decodedVideoName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    
    return (
        <div className="h-full w-full flex flex-col overflow-hidden bg-background">
            {/* Video Player Container */}
            <div className="flex-1 flex items-center justify-center bg-background overflow-hidden">
                <div className="w-full h-full flex items-center justify-center px-0">
                    <div className="w-full aspect-video max-h-full">
                        <VideoPlayer 
                            url={hlsUrl}
                            title={title}
                        />
                    </div>
                </div>
            </div>

            {/* Video Info Section */}
            <div className="shrink-0 p-6 border-t border-border bg-background">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-xl font-semibold text-foreground mb-2">
                        {title}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-mono text-xs break-all">{hlsUrl}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PlayPage