import UploadForm from "@/components/task/upload/uploadForm"

const UploadPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="mx-auto px-6 py-8 max-w-[1400px]">
        <div className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Upload Video</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Upload and manage your video content</p>
        </div>
        <UploadForm />
      </div>
    </div>
  )
}

export default UploadPage