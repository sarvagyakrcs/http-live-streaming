import UploadForm from "@/components/task/upload/uploadForm"

const UploadPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <div className="space-y-2 mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Upload Video</h1>
          <p className="text-muted-foreground">Add a new video to your library</p>
        </div>
        <UploadForm />
      </div>
    </div>
  )
}

export default UploadPage