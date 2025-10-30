'use client'

interface UploadStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'completed' | 'error'
}

interface UploadProgressProps {
  steps: UploadStep[]
}

export const UploadProgress = ({ steps }: UploadProgressProps) => {
  const currentStepIndex = steps.findIndex(step => step.status === 'in-progress')
  const completedSteps = steps.filter(step => step.status === 'completed').length
  const progress = (completedSteps / steps.length) * 100

  return (
    <div className='space-y-6'>
      {/* Progress Bar */}
      <div className='space-y-2'>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-muted-foreground font-medium'>Processing</span>
          <span className='text-foreground font-medium'>{Math.round(progress)}%</span>
        </div>
        <div className='h-1.5 w-full bg-muted rounded-full overflow-hidden'>
          <div 
            className='h-full bg-primary transition-all duration-500 ease-out relative overflow-hidden'
            style={{ width: `${progress}%` }}
          >
            <div className='absolute inset-0 bg-linear-to-r from-transparent via-primary-foreground/20 to-transparent animate-shimmer' />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className='space-y-3'>
        {steps.map((step, index) => {
          const isCompleted = step.status === 'completed'
          const isInProgress = step.status === 'in-progress'
          const isError = step.status === 'error'
          const isPending = step.status === 'pending'

          return (
            <div
              key={step.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 ${
                isInProgress
                  ? 'bg-primary/5 border-primary/30 shadow-sm shadow-primary/10'
                  : isCompleted
                    ? 'bg-card border-border/50'
                    : isError
                      ? 'bg-destructive/5 border-destructive/30'
                      : 'bg-card border-border/30 opacity-60'
              }`}
            >
              {/* Step Icon */}
              <div className='shrink-0 mt-0.5'>
                {isCompleted ? (
                  <div className='w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center'>
                    <svg className='w-3 h-3 text-primary' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M5 13l4 4L19 7' />
                    </svg>
                  </div>
                ) : isInProgress ? (
                  <div className='w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin' />
                ) : isError ? (
                  <div className='w-5 h-5 rounded-full bg-destructive/20 border border-destructive/40 flex items-center justify-center'>
                    <svg className='w-3 h-3 text-destructive' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M6 18L18 6M6 6l12 12' />
                    </svg>
                  </div>
                ) : (
                  <div className='w-5 h-5 rounded-full border-2 border-border bg-muted' />
                )}
              </div>

              {/* Step Content */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2'>
                  <p className={`text-sm font-medium ${
                    isInProgress || isCompleted ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </p>
                  {isInProgress && (
                    <div className='flex items-center gap-1'>
                      <div className='w-1 h-1 rounded-full bg-primary animate-pulse' />
                      <div className='w-1 h-1 rounded-full bg-primary animate-pulse [animation-delay:0.2s]' />
                      <div className='w-1 h-1 rounded-full bg-primary animate-pulse [animation-delay:0.4s]' />
                    </div>
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${
                  isInProgress || isCompleted ? 'text-muted-foreground' : 'text-muted-foreground/60'
                }`}>
                  {step.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

