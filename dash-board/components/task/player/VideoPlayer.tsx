'use client'

import { useEffect, useRef, useState } from 'react'
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
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null)

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

    video.addEventListener('timeupdate', updateTime)
    video.addEventListener('loadedmetadata', updateDuration)
    video.addEventListener('progress', updateBuffered)
    video.addEventListener('durationchange', updateDuration)

    return () => {
      video.removeEventListener('timeupdate', updateTime)
      video.removeEventListener('loadedmetadata', updateDuration)
      video.removeEventListener('progress', updateBuffered)
      video.removeEventListener('durationchange', updateDuration)
    }
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    setIsMuted(!isMuted)
  }

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

  const toggleFullscreen = () => {
    const container = containerRef.current
    if (!container) return

    if (!document.fullscreenElement) {
      container.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const skip = (seconds: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, video.duration))
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
      className="relative w-full h-full bg-black overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-contain"
        onClick={togglePlay}
        playsInline
      />

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Always Visible Quality Indicator */}
      {getCurrentQualityLabel() && (
        <div className="absolute top-4 right-4 z-10 pointer-events-none">
          <div className="px-3 py-1.5 bg-black/80 backdrop-blur-sm rounded-full border border-white/20 text-white text-xs font-semibold shadow-lg">
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
            <h2 className="text-white text-lg font-medium drop-shadow-lg">{title}</h2>
          </div>
        )}

        {/* Center Play Button */}
        {!isPlaying && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            <button
              onClick={togglePlay}
              className="w-20 h-20 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 transition-all transform hover:scale-110 shadow-2xl"
            >
              <Play className="w-10 h-10 text-white ml-1" fill="white" />
            </button>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8 pointer-events-auto">
          {/* Progress Bar */}
          <div className="mb-3">
            <div
              ref={progressBarRef}
              className="relative w-full h-1 bg-white/30 rounded-full cursor-pointer hover:h-1.5 transition-all group"
              onClick={handleProgressClick}
            >
              {/* Buffered */}
              <div
                className="absolute top-0 left-0 h-full bg-white/40 rounded-full"
                style={{ width: `${buffered}%` }}
              />
              {/* Progress */}
              <div
                className="absolute top-0 left-0 h-full bg-red-600 rounded-full"
                style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-1">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" fill="white" />
                ) : (
                  <Play className="w-5 h-5" fill="white" />
                )}
              </button>

              {/* Skip Buttons */}
              <button
                onClick={() => skip(-10)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => skip(10)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2 group/volume ml-2">
                <button
                  onClick={toggleMute}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
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
                  className="w-0 group-hover/volume:w-20 transition-all opacity-0 group-hover/volume:opacity-100 accent-red-600"
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
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>

                {/* Quality Menu */}
                {showQualityMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/95 rounded-lg shadow-xl border border-white/10 min-w-[160px] py-2 z-50">
                    <div className="px-3 py-2 text-xs text-white/60 font-medium border-b border-white/10">
                      Quality
                    </div>
                    {/* Auto */}
                    <button
                      onClick={() => changeQuality(-1)}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 transition-colors flex items-center justify-between"
                    >
                      <span className="text-white">Auto</span>
                      {currentQuality === -1 && <Check className="w-4 h-4 text-white" />}
                    </button>
                    {/* Quality Levels */}
                    {qualityLevels
                      .sort((a, b) => b.height - a.height)
                      .map((level) => (
                        <button
                          key={level.index}
                          onClick={() => changeQuality(level.index)}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 transition-colors flex items-center justify-between"
                        >
                          <span className="text-white">{getQualityLabel(level.height)}</span>
                          {currentQuality === level.index && <Check className="w-4 h-4 text-white" />}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
