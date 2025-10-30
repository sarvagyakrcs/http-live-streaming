'use client'

interface UploadProgressProps {
  message: string
}

export const UploadProgress = ({ message }: UploadProgressProps) => {
  return (
    <div className='flex flex-col items-center justify-center py-16'>
      <div className='w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin mb-4' />
      <p className='text-sm text-muted-foreground text-center'>{message}</p>
    </div>
  )
}

