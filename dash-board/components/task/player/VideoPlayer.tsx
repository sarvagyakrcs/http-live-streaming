'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, SkipBack, SkipForward, Check } from 'lucide-react'

interface VideoPlayerProps {
  url: string
  title?: string
}

interface QualityLevel {
  height: number
  bitrate: number
  index: number
}

export const VideoPlayer = ({ url, title }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const previewHlsRef = useRef<Hls | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [buffered, setBuffered] = useState(0)
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([])
  const [currentQuality, setCurrentQuality] = useState(-1)
  const [activeQuality, setActiveQuality] = useState<number | null>(null) // Actually playing quality
  const [isLoading, setIsLoading] = useState(true)
  const [isBuffering, setIsBuffering] = useState(false)
  const [showSkipAnimation, setShowSkipAnimation] = useState<'forward' | 'backward' | null>(null)
  const [previewTime, setPreviewTime] = useState<number | null>(null)
  const [previewPosition, setPreviewPosition] = useState<number>(0)
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null)
  const [previewAlign, setPreviewAlign] = useState<'left' | 'center' | 'right'>('center')
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null)
  const lastTapTime = useRef<{ left: number; right: number }>({ left: 0, right: 0 })
  const skipAnimationTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        debug: false,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
      })
      
      hlsRef.current = hls
      
      hls.loadSource(url)
      hls.attachMedia(video)
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const levels: QualityLevel[] = hls.levels.map((level, index) => ({
          height: level.height,
          bitrate: level.bitrate,
          index,
        }))
        setQualityLevels(levels)
        setCurrentQuality(-1)
        setIsLoading(false)
      })
      
      // Track actual playing quality
      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        setActiveQuality(data.level)
      })
      
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Network error, trying to recover...')
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Media error, trying to recover...')
              hls.recoverMediaError()
              break
            default:
              console.error('Fatal error:', data.type)
              hls.destroy()
              break
          }
        }
      })

      return () => {
        hls.destroy()
      }
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
      queueMicrotask(() => setIsLoading(false))
    }
  }, [url])

  // Setup preview video for thumbnails
  useEffect(() => {
    const previewVideo = previewVideoRef.current
    if (!previewVideo) return

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 10,
        maxMaxBufferLength: 10
      })
      previewHlsRef.current = hls

      hls.loadSource(url)
      hls.attachMedia(previewVideo)

      // Set to lowest quality for preview
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (hls.levels.length > 0) {
          hls.currentLevel = hls.levels.length - 1 // Lowest quality
        }
      })

      return () => {
        hls.destroy()
      }
    } else if (previewVideo.canPlayType('application/vnd.apple.mpegurl')) {
      previewVideo.src = url
    }
  }, [url])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateTime = () => setCurrentTime(video.currentTime)
    const updateDuration = () => setDuration(video.duration)
    const updateBuffered = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1)
        const bufferedPercent = (bufferedEnd / video.duration) * 100
        setBuffered(isNaN(bufferedPercent) ? 0 : bufferedPercent)
      }
    }
    const handleWaiting = () => setIsBuffering(true)
    const handleCanPlay = () => setIsBuffering(false)
    const handlePlaying = () => setIsBuffering(false)

    video.addEventListener('timeupdate', updateTime)
    video.addEventListener('loadedmetadata', updateDuration)
    video.addEventListener('progress', updateBuffered)
    video.addEventListener('durationchange', updateDuration)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('playing', handlePlaying)

    return () => {
      video.removeEventListener('timeupdate', updateTime)
      video.removeEventListener('loadedmetadata', updateDuration)
      video.removeEventListener('progress', updateBuffered)
      video.removeEventListener('durationchange', updateDuration)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('playing', handlePlaying)
    }
  }, [])

  const adjustVolume = useCallback((delta: number) => {
    const video = videoRef.current
    if (!video) return
    const newVolume = Math.max(0, Math.min(1, video.volume + delta))
    video.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }, [])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }, [])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    setIsMuted(!isMuted)
  }, [isMuted])

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return

    const newVolume = parseFloat(e.target.value)
    video.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    const progressBar = progressBarRef.current
    if (!video || !progressBar) return

    const rect = progressBar.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    video.currentTime = pos * video.duration
  }

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = progressBarRef.current
    const previewVideo = previewVideoRef.current
    const canvas = previewCanvasRef.current
    
    if (!progressBar || !duration || !previewVideo || !canvas) return

    const rect = progressBar.getBoundingClientRect()
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const time = pos * duration
    const mouseX = e.clientX - rect.left
    
    setPreviewTime(time)
    setPreviewPosition(mouseX)

    // Determine alignment based on position to avoid edge overflow
    // Thumbnail width is ~160px, so we need ~80px on each side for center alignment
    const thumbnailHalfWidth = 80
    const padding = 10 // Additional padding from edges
    
    if (mouseX < thumbnailHalfWidth + padding) {
      setPreviewAlign('left')
    } else if (mouseX > rect.width - thumbnailHalfWidth - padding) {
      setPreviewAlign('right')
    } else {
      setPreviewAlign('center')
    }

    // Seek preview video to the time
    if (Math.abs(previewVideo.currentTime - time) > 0.5) {
      previewVideo.currentTime = time
      
      // Wait for video to seek and then capture frame
      const onSeeked = () => {
        try {
          const ctx = canvas.getContext('2d')
          if (ctx && previewVideo.readyState >= 2) {
            canvas.width = 160
            canvas.height = 90
            ctx.drawImage(previewVideo, 0, 0, canvas.width, canvas.height)
            setPreviewThumbnail(canvas.toDataURL())
          }
        } catch (err) {
          console.error('Error capturing thumbnail:', err)
        }
        previewVideo.removeEventListener('seeked', onSeeked)
      }
      
      previewVideo.addEventListener('seeked', onSeeked)
    }
  }

  const handleProgressLeave = () => {
    setPreviewTime(null)
    setPreviewThumbnail(null)
  }

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    if (!document.fullscreenElement) {
      container.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])

  const skip = useCallback((seconds: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, video.duration))
    
    // Show skip animation
    setShowSkipAnimation(seconds > 0 ? 'forward' : 'backward')
    if (skipAnimationTimeout.current) {
      clearTimeout(skipAnimationTimeout.current)
    }
    skipAnimationTimeout.current = setTimeout(() => {
      setShowSkipAnimation(null)
    }, 800)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key.toLowerCase()) {
        case 'm':
          e.preventDefault()
          toggleMute()
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'k':
        case ' ':
          e.preventDefault()
          togglePlay()
          break
        case 'j':
          e.preventDefault()
          skip(-10)
          break
        case 'l':
          e.preventDefault()
          skip(10)
          break
        case 'arrowleft':
          e.preventDefault()
          skip(-5)
          break
        case 'arrowright':
          e.preventDefault()
          skip(5)
          break
        case 'arrowup':
          e.preventDefault()
          adjustVolume(0.1)
          break
        case 'arrowdown':
          e.preventDefault()
          adjustVolume(-0.1)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggleMute, toggleFullscreen, togglePlay, skip, adjustVolume])

  const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    const video = videoRef.current
    if (!video) return
    
    const rect = video.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const videoWidth = rect.width
    const now = Date.now()
    
    // Left third for backward skip
    if (clickX < videoWidth / 3) {
      const timeSinceLastTap = now - lastTapTime.current.left
      if (timeSinceLastTap < 300) {
        // Double tap detected
        skip(-5)
      }
      lastTapTime.current.left = now
    }
    // Right third for forward skip
    else if (clickX > (videoWidth * 2) / 3) {
      const timeSinceLastTap = now - lastTapTime.current.right
      if (timeSinceLastTap < 300) {
        // Double tap detected
        skip(5)
      }
      lastTapTime.current.right = now
    }
    // Middle third for play/pause
    else {
      const timeSinceLastTap = Math.max(
        now - lastTapTime.current.left,
        now - lastTapTime.current.right
      )
      if (timeSinceLastTap > 300) {
        togglePlay()
      }
    }
  }

  const changeQuality = (levelIndex: number) => {
    const hls = hlsRef.current
    if (!hls) return

    hls.currentLevel = levelIndex
    setCurrentQuality(levelIndex)
    setShowQualityMenu(false)
  }

  const getQualityLabel = (height: number) => {
    if (height >= 2160) return '4K'
    if (height >= 1440) return '1440p'
    if (height >= 1080) return '1080p'
    if (height >= 720) return '720p'
    if (height >= 480) return '480p'
    if (height >= 360) return '360p'
    if (height >= 240) return '240p'
    return `${height}p`
  }

  const getCurrentQualityLabel = () => {
    if (activeQuality === null || activeQuality === undefined) return null
    const level = qualityLevels.find(l => l.index === activeQuality)
    if (!level) return null
    const label = getQualityLabel(level.height)
    return currentQuality === -1 ? `${label} (Auto)` : label
  }

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00'
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current)
    }
    hideControlsTimeout.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-background overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-contain"
        onClick={handleVideoClick}
        playsInline
        crossOrigin="anonymous"
      />

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-50">
          <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Buffering Spinner */}
      {isBuffering && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
          <div className="w-16 h-16 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Skip Animations */}
      {showSkipAnimation === 'backward' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="relative animate-[fadeIn_0.3s_ease-out]">
            {/* Background circle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-card/80 backdrop-blur-sm rounded-full border border-border" />
            </div>
            {/* Content */}
            <div className="relative flex items-center justify-center w-32 h-32">
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center -space-x-3">
                  <SkipBack className="w-8 h-8 text-foreground opacity-60" />
                  <SkipBack className="w-8 h-8 text-foreground opacity-80" />
                  <SkipBack className="w-8 h-8 text-foreground" />
                </div>
                <span className="text-foreground text-sm font-semibold mt-1">5 seconds</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSkipAnimation === 'forward' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="relative animate-[fadeIn_0.3s_ease-out]">
            {/* Background circle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-card/80 backdrop-blur-sm rounded-full border border-border" />
            </div>
            {/* Content */}
            <div className="relative flex items-center justify-center w-32 h-32">
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center -space-x-3">
                  <SkipForward className="w-8 h-8 text-foreground" />
                  <SkipForward className="w-8 h-8 text-foreground opacity-80" />
                  <SkipForward className="w-8 h-8 text-foreground opacity-60" />
                </div>
                <span className="text-foreground text-sm font-semibold mt-1">5 seconds</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Always Visible Quality Indicator */}
      {getCurrentQualityLabel() && (
        <div className="absolute top-4 right-4 z-10 pointer-events-none">
          <div className="px-3 py-1.5 bg-card/90 backdrop-blur-sm rounded-full border border-border text-card-foreground text-xs font-semibold shadow-lg">
            {getCurrentQualityLabel()}
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%, rgba(0,0,0,0.4) 100%)' }}
      >
        {/* Top Bar */}
        {title && (
          <div className="absolute top-0 left-0 right-0 p-4 pointer-events-auto">
            <h2 className="text-card-foreground text-lg font-medium drop-shadow-lg">{title}</h2>
          </div>
        )}

        {/* Center Play Button */}
        {!isPlaying && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            <button
              onClick={togglePlay}
              className="w-20 h-20 flex items-center justify-center rounded-full bg-destructive hover:bg-destructive/90 transition-all transform hover:scale-110 shadow-2xl"
            >
              <Play className="w-10 h-10 text-destructive-foreground ml-1" fill="currentColor" />
            </button>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8 pointer-events-auto">
          {/* Progress Bar */}
          <div className="mb-3 relative">
            {/* Preview Tooltip */}
            {previewTime !== null && (
              <div 
                className="absolute bottom-full mb-3 pointer-events-none z-50 w-40"
                style={{ 
                  left: previewAlign === 'left' ? `${previewPosition}px` :
                        previewAlign === 'center' ? `${previewPosition - 80}px` :
                        `${previewPosition - 160}px`
                }}
              >
                <div className="flex flex-col items-center gap-2 w-full">
                  {/* Thumbnail */}
                  {previewThumbnail && (
                    <div className="rounded-lg overflow-hidden border border-border shadow-xl bg-card w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={previewThumbnail} 
                        alt="Preview" 
                        className="w-full h-auto"
                      />
                    </div>
                  )}
                  {/* Time */}
                  <div className="px-3 py-1.5 bg-card/95 backdrop-blur-sm rounded-lg border border-border shadow-xl">
                    <span className="text-card-foreground text-sm font-semibold whitespace-nowrap">
                      {formatTime(previewTime)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div
              ref={progressBarRef}
              className="relative w-full h-1 bg-muted rounded-full cursor-pointer hover:h-1.5 transition-all group"
              onClick={handleProgressClick}
              onMouseMove={handleProgressHover}
              onMouseLeave={handleProgressLeave}
            >
              {/* Buffered */}
              <div
                className="absolute top-0 left-0 h-full bg-muted-foreground/40 rounded-full"
                style={{ width: `${buffered}%` }}
              />
              {/* Progress */}
              <div
                className="absolute top-0 left-0 h-full bg-destructive rounded-full"
                style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between text-card-foreground">
            <div className="flex items-center gap-1">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" fill="currentColor" />
                ) : (
                  <Play className="w-5 h-5" fill="currentColor" />
                )}
              </button>

              {/* Skip Buttons */}
              <button
                onClick={() => skip(-10)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => skip(10)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2 group/volume ml-2">
                <button
                  onClick={toggleMute}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-0 group-hover/volume:w-20 transition-all opacity-0 group-hover/volume:opacity-100 accent-destructive"
                />
              </div>

              {/* Time */}
              <span className="text-sm font-medium ml-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Quality Settings */}
              <div className="relative">
                <button 
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>

                {/* Quality Menu */}
                {showQualityMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-card border border-border rounded-lg shadow-xl min-w-[160px] py-2 z-50">
                    <div className="px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border">
                      Quality
                    </div>
                    {/* Auto */}
                    <button
                      onClick={() => changeQuality(-1)}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-accent transition-colors flex items-center justify-between"
                    >
                      <span className="text-card-foreground">Auto</span>
                      {currentQuality === -1 && <Check className="w-4 h-4 text-primary" />}
                    </button>
                    {/* Quality Levels */}
                    {qualityLevels
                      .sort((a, b) => b.height - a.height)
                      .map((level) => (
                        <button
                          key={level.index}
                          onClick={() => changeQuality(level.index)}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-accent transition-colors flex items-center justify-between"
                        >
                          <span className="text-card-foreground">{getQualityLabel(level.height)}</span>
                          {currentQuality === level.index && <Check className="w-4 h-4 text-primary" />}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden preview video and canvas for thumbnail generation */}
      <video
        ref={previewVideoRef}
        className="hidden"
        preload="metadata"
        muted
        crossOrigin="anonymous"
      />
      <canvas
        ref={previewCanvasRef}
        className="hidden"
      />
    </div>
  )
}
