import { getUrl } from "@/lib/utils";

export const baseUrls : Record<string, string> = {
    uploadServer: "http://localhost:6969",
    videoServer: "https://traditional-video-fetching-server.sarvagyakrcs.workers.dev"
}

export const apiEndpoints : Record<string, Record<string, string>> = {
    uploadServer: {
        upload: getUrl(baseUrls.uploadServer, "upload"),
        ping: getUrl(baseUrls.uploadServer, "ping")
    },
    videoServer: {
        ping: getUrl(baseUrls.videoServer, "ping")
    }
}   