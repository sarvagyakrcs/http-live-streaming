import { getUrl } from "@/lib/utils";

export const baseUrls : Record<string, string> = {
    uploadServer: "http://localhost:6969",
    videoServer: "https://test-video-fetching-server.sarvagyakrcs.workers.dev",
    syncServer: "http://localhost:9696"
}

export const apiEndpoints : Record<string, Record<string, string>> = {
    uploadServer: {
        upload: getUrl(baseUrls.uploadServer, "upload"),
        ping: getUrl(baseUrls.uploadServer, "ping")
    },
    videoServer: {
        ping: getUrl(baseUrls.videoServer, "ping")
    },
    syncServer: {
        ping: getUrl(baseUrls.syncServer, "ping")
    }
}   

export const SlaveS3Buckets : Record<string, string>[] = [
    {
        Region:     "ap-south-1",
		BucketName: "dash-video-bucket-2",
    },
    {
        Region:     "ap-southeast-1",
	    BucketName: "dash-video-bucket-3a",
    },

]