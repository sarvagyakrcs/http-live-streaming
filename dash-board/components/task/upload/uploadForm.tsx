'use client'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UploadFormSchema, uploadFormSchema } from '@/lib/schema/upload/upload-form-schema'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import axios from 'axios'
import { apiEndpoints } from '@/config'
import { Spinner } from '@/components/ui/spinner'
import { UploadProgress } from './uploadProgress'

interface UploadStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'completed' | 'error'
}

const UploadForm = () => {
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [videoSize, setVideoSize] = useState<number | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadSteps, setUploadSteps] = useState<UploadStep[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<UploadFormSchema>({
    defaultValues: {
        video: null,
        title: '',
    },
    resolver: zodResolver(uploadFormSchema),
  })

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview)
      }
    }
  }, [videoPreview])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleFileChange = (file: File | null) => {
    form.setValue('video', file)
    
    if (file) {
      setVideoSize(file.size)
      setFileName(file.name)
      const url = URL.createObjectURL(file)
      setVideoPreview(url)
    } else {
      setVideoSize(null)
      setFileName(null)
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview)
      }
      setVideoPreview(null)
    }
  }

  const updateStepStatus = (stepId: string, status: UploadStep['status']) => {
    setUploadSteps(prev => 
      prev.map(step => step.id === stepId ? { ...step, status } : step)
    )
  }

  const onSubmit = async (data: UploadFormSchema) => {
    if (!data.video) {
      toast.error('Please select a video file')
      return
    }

    setIsUploading(true)
    
    // Initialize steps
    const steps: UploadStep[] = [
      {
        id: 'upload',
        title: 'Sending video chunks',
        description: 'Uploading video data to server',
        status: 'pending'
      },
      {
        id: 'transcode-144p',
        title: 'Transcoding to 144p',
        description: 'Creating low resolution variant',
        status: 'pending'
      },
      {
        id: 'transcode-360p',
        title: 'Transcoding to 360p',
        description: 'Creating medium resolution variant',
        status: 'pending'
      },
      {
        id: 'transcode-720p',
        title: 'Transcoding to 720p',
        description: 'Creating high resolution variant',
        status: 'pending'
      },
      {
        id: 'storage',
        title: 'Uploading to storage',
        description: 'Saving chunks to object store',
        status: 'pending'
      }
    ]
    setUploadSteps(steps)
    
    try {
      // Step 1: Upload chunks
      updateStepStatus('upload', 'in-progress')
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate delay
      
      const formData = new FormData()
      formData.append('video', data.video)
      formData.append('title', data.title)
      console.log(apiEndpoints.uploadServer.upload)
      
      const response = await axios.post(apiEndpoints.uploadServer.upload, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      updateStepStatus('upload', 'completed')
      
      // Step 2: Transcode 144p
      updateStepStatus('transcode-144p', 'in-progress')
      await new Promise(resolve => setTimeout(resolve, 1500))
      updateStepStatus('transcode-144p', 'completed')
      
      // Step 3: Transcode 360p
      updateStepStatus('transcode-360p', 'in-progress')
      await new Promise(resolve => setTimeout(resolve, 1500))
      updateStepStatus('transcode-360p', 'completed')
      
      // Step 4: Transcode 720p
      updateStepStatus('transcode-720p', 'in-progress')
      await new Promise(resolve => setTimeout(resolve, 1500))
      updateStepStatus('transcode-720p', 'completed')
      
      // Step 5: Upload to storage
      updateStepStatus('storage', 'in-progress')
      await new Promise(resolve => setTimeout(resolve, 1500))
      updateStepStatus('storage', 'completed')

      const timeElapsed = response.data.elapsed
      toast.success(`Video uploaded successfully, took ${timeElapsed.toFixed(2)} seconds`)
      
      // Reset form after a brief delay to show completion
      await new Promise(resolve => setTimeout(resolve, 1000))
      form.reset()
      setVideoPreview(null)
      setVideoSize(null)
      setFileName(null)
      setUploadSteps([])
      
    } catch (error) {
      console.error('Upload error:', error)
      
      // Mark current step as error
      const currentStep = uploadSteps.find(s => s.status === 'in-progress')
      if (currentStep) {
        updateStepStatus(currentStep.id, 'error')
      }
      
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || error.message || 'Failed to upload video')
      } else {
        toast.error('Failed to upload video')
      }
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* Main Form Area */}
          <div className='space-y-5'>
            {/* Video Upload Zone */}
            <FormField
              control={form.control}
              name='video'
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault()
                        setIsDragging(true)
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setIsDragging(false)
                        const file = e.dataTransfer.files?.[0]
                        if (file && file.type.startsWith('video/')) {
                          handleFileChange(file)
                        }
                      }}
                      className={`relative border-2 border-dashed rounded-lg transition-all duration-200 ${
                        isDragging 
                          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' 
                          : fileName 
                            ? 'border-primary/40 bg-card' 
                            : 'border-border bg-card hover:border-primary/40 hover:bg-accent/50'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type='file'
                        accept='video/*'
                        className='hidden'
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null
                          handleFileChange(file)
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                      
                      {fileName ? (
                        <div className='p-6'>
                          <div className='flex items-start gap-3'>
                            <div className='shrink-0 w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center'>
                              <svg className='w-5 h-5 text-primary' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' />
                              </svg>
                            </div>
                            <div className='flex-1 min-w-0'>
                              <p className='text-sm font-medium text-foreground truncate'>{fileName}</p>
                              <p className='text-xs text-muted-foreground mt-0.5'>{videoSize && formatFileSize(videoSize)}</p>
                            </div>
                            <button
                              type='button'
                              onClick={() => handleFileChange(null)}
                              className='shrink-0 text-muted-foreground hover:text-foreground transition-colors'
                            >
                              <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                              </svg>
                            </button>
                          </div>
                          <button
                            type='button'
                            onClick={() => fileInputRef.current?.click()}
                            className='mt-3 text-xs text-primary hover:text-primary/80 transition-colors font-medium'
                          >
                            Choose a different file
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className='p-10 cursor-pointer'
                        >
                          <div className='flex flex-col items-center text-center space-y-3'>
                            <div className='w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center'>
                              <svg className='w-6 h-6 text-muted-foreground' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' />
                              </svg>
                            </div>
                            <div className='space-y-1.5'>
                              <p className='text-sm font-medium text-foreground'>
                                <span className='text-primary'>Click to upload</span> or drag and drop
                              </p>
                              <p className='text-xs text-muted-foreground'>MP4, MOV, AVI or WEBM (max 2GB)</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title Input */}
            <FormField
              control={form.control}
              name='title'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-sm font-medium text-foreground'>Video Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder='Enter a descriptive title for your video' 
                      {...field}
                      className='h-11 bg-background border-border focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary transition-all'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Upload Button */}
            <Button 
              type='submit' 
              size='lg'
              className='w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm hover:shadow-md hover:shadow-primary/20 disabled:opacity-50 font-medium' 
              disabled={isUploading || !fileName}
            >
              {isUploading ? (
                <div className='flex items-center gap-2'>
                  <Spinner />
                  <span>Uploading...</span>
                </div>
              ) : (
                'Upload Video'
              )}
            </Button>
          </div>

          {/* Preview Area */}
          <div className='bg-card border border-border rounded-lg overflow-hidden'>
            <div className='px-4 py-2.5 border-b border-border bg-muted/30'>
              <div className='flex items-center justify-between'>
                <h3 className='text-sm font-medium text-foreground'>
                  {isUploading ? 'Upload Progress' : 'Preview'}
                </h3>
                {videoPreview && !isUploading && (
                  <div className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-sm shadow-primary/50'></div>
                    <span className='text-xs text-muted-foreground'>Ready</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className='p-4'>
              {isUploading && uploadSteps.length > 0 ? (
                <UploadProgress steps={uploadSteps} />
              ) : videoPreview ? (
                <div className='aspect-video w-full overflow-hidden rounded-md bg-muted border border-border'>
                  <video 
                    src={videoPreview} 
                    controls 
                    className='h-full w-full object-contain'
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <div className='aspect-video w-full flex flex-col items-center justify-center text-center bg-muted/50 border border-dashed border-border rounded-md'>
                  <div className='w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center mb-3'>
                    <svg className='w-6 h-6 text-muted-foreground' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z' />
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                    </svg>
                  </div>
                  <p className='text-xs text-muted-foreground px-4'>Your video preview will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </Form>
  )
}

export default UploadForm