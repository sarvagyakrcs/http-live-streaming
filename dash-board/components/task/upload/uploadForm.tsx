'use client'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UploadFormSchema, uploadFormSchema } from '@/lib/schema/upload/upload-form-schema'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import axios from 'axios'
import { apiEndpoints } from '@/config'
import { Spinner } from '@/components/ui/spinner'

const UploadForm = () => {
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [videoSize, setVideoSize] = useState<number | null>(null)
  const [isUploading, setIsUploading] = useState(false)

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

  const onSubmit = async (data: UploadFormSchema) => {
    if (!data.video) {
      toast.error('Please select a video file')
      return
    }

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('video', data.video)
      formData.append('title', data.title)
        console.log(apiEndpoints.uploadServer.upload)
      const response = await axios.post(apiEndpoints.uploadServer.upload, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const timeElapsed = response.data.elapsed
      toast.success(`Video uploaded successfully, took ${timeElapsed.toFixed(2)} seconds`)
      
      // Reset form
      form.reset()
      setVideoPreview(null)
      setVideoSize(null)
      
    } catch (error) {
      console.error('Upload error:', error)
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
    <div className='w-full max-w-md'>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
                <FormField
                    control={form.control}
                    name='title'
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                                <Input placeholder='Enter video title' {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name='video'
                    render={({ field: { onChange, ...field } }) => (
                        <FormItem>
                            <FormLabel>Upload a video</FormLabel>
                            <FormControl>
                                <Input 
                                    type='file' 
                                    accept='video/*'
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] || null
                                        onChange(file)
                                        
                                        if (file) {
                                            // Set file size
                                            setVideoSize(file.size)
                                            
                                            // Create preview URL
                                            const url = URL.createObjectURL(file)
                                            setVideoPreview(url)
                                        } else {
                                            setVideoSize(null)
                                            if (videoPreview) {
                                                URL.revokeObjectURL(videoPreview)
                                            }
                                            setVideoPreview(null)
                                        }
                                    }}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                 )}
                 />
                 
                 {videoPreview && videoSize && (
                     <div className='space-y-4'>
                         <div className='rounded-lg border p-4'>
                             <p className='text-sm text-muted-foreground mb-2'>
                                 File size: <span className='font-medium text-foreground'>{formatFileSize(videoSize)}</span>
                             </p>
                             <div className='aspect-video w-full overflow-hidden rounded-md bg-muted'>
                                 <video 
                                     src={videoPreview} 
                                     controls 
                                     className='h-full w-full object-contain'
                                 >
                                     Your browser does not support the video tag.
                                 </video>
                             </div>
                         </div>
                     </div>
                 )}
                 <Button type='submit' className='w-full' disabled={isUploading}>
                     {isUploading ? <Spinner /> : 'Upload'}
                 </Button>
             </form>
        </Form>
    </div>
  )
}

export default UploadForm