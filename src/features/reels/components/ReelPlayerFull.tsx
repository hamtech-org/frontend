import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRecordReelViewMutation } from '@/store/api/newsfeedApi';
import type { IReel } from '@/types/newsfeed.types';

interface VideoRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Props {
  reel: IReel;
  isVisible: boolean;
  volume: number;
  onVolumeChange: (v: number) => void;
  isMuted: boolean;
  onMutedChange: (m: boolean) => void;
  onVideoRectChange?: (rect: VideoRect) => void;
}

function computeVideoRect(
  containerW: number,
  containerH: number,
  videoW: number,
  videoH: number,
): VideoRect {
  if (!videoW || !videoH || !containerW || !containerH) {
    return { top: 0, left: 0, width: containerW, height: containerH };
  }
  const scale = Math.min(containerW / videoW, containerH / videoH);
  const w = videoW * scale;
  const h = videoH * scale;
  return {
    top: (containerH - h) / 2,
    left: (containerW - w) / 2,
    width: w,
    height: h,
  };
}

export type { VideoRect };

export const ReelPlayerFull = ({
  reel,
  isVisible,
  volume,
  onVolumeChange,
  isMuted,
  onMutedChange,
  onVideoRectChange,
}: Props) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const volumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewRecordedRef = useRef(false);
  const watchStartRef = useRef<number | null>(null);

  const [videoRect, setVideoRect] = useState<VideoRect>({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  });

  const [recordView] = useRecordReelViewMutation();

  // Compute video rect when metadata loads or container resizes
  const recalcRect = useCallback(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;
    const rect = computeVideoRect(
      container.clientWidth,
      container.clientHeight,
      video.videoWidth,
      video.videoHeight,
    );
    setVideoRect(rect);
    onVideoRectChange?.(rect);
  }, [onVideoRectChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => recalcRect());
    observer.observe(container);
    return () => observer.disconnect();
  }, [recalcRect]);

  // Autoplay / pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isVisible) {
      video.play().catch(() => {});
      setIsPlaying(true);
      watchStartRef.current = Date.now();
    } else {
      video.pause();
      setIsPlaying(false);
      watchStartRef.current = null;
      setCaptionExpanded(false);
    }
  }, [isVisible]);

  // Sync volume + muted imperatively (React doesn't reliably update muted DOM property)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = isMuted;
  }, [volume, isMuted]);

  // Record view after 2s
  useEffect(() => {
    if (!isVisible || viewRecordedRef.current) return;

    const timer = setTimeout(() => {
      if (watchStartRef.current) {
        const watchedMs = Date.now() - watchStartRef.current;
        if (watchedMs >= 2000) {
          recordView({ reelId: reel.reelId, watchedMs, completed: false });
          viewRecordedRef.current = true;
        }
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [isVisible, reel.reelId, recordView]);

  const handleTogglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 600);
  }, []);

  const handleToggleMute = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isMuted) {
        onMutedChange(false);
        if (volume === 0) onVolumeChange(0.5);
      } else {
        onMutedChange(true);
      }
    },
    [isMuted, volume, onMutedChange, onVolumeChange],
  );

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      const newVolume = parseFloat(e.target.value);
      onVolumeChange(newVolume);
      if (newVolume === 0) {
        onMutedChange(true);
      } else if (isMuted) {
        onMutedChange(false);
      }
    },
    [isMuted, onVolumeChange, onMutedChange],
  );

  const handleVolumeAreaEnter = useCallback(() => {
    if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current);
    setShowVolumeSlider(true);
  }, []);

  const handleVolumeAreaLeave = useCallback(() => {
    volumeTimeoutRef.current = setTimeout(() => setShowVolumeSlider(false), 300);
  }, []);

  const hasLongCaption = (reel.caption?.length ?? 0) > 80;

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center w-full h-full bg-black cursor-pointer select-none"
      onClick={handleTogglePlay}
    >
      <video
        ref={videoRef}
        src={reel.videoUrl}
        poster={reel.thumbnailUrl ?? undefined}
        muted={isMuted}
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 w-full h-full object-contain"
        onLoadedMetadata={recalcRect}
      />

      {/* Overlay wrapper — positioned exactly over the rendered video area */}
      <div
        className="absolute z-10 pointer-events-none"
        style={{
          top: videoRect.top,
          left: videoRect.left,
          width: videoRect.width,
          height: videoRect.height,
        }}
      >
        {/* Gradient overlay bottom */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/70 via-black/30 to-transparent" />

        {/* Volume control — top-left inside video */}
        <div
          className="absolute top-4 left-4 z-20 pointer-events-auto flex items-center h-12 rounded-full bg-black/20 hover:bg-black/60 backdrop-blur-sm overflow-hidden transition-colors"
          style={{ width: showVolumeSlider ? '11rem' : '3rem', transition: 'width 200ms ease-out' }}
          onMouseEnter={handleVolumeAreaEnter}
          onMouseLeave={handleVolumeAreaLeave}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleToggleMute}
            className="shrink-0 size-12 flex items-center justify-center"
            aria-label={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="size-5 text-white" />
            ) : (
              <Volume2 className="size-5 text-white" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="volume-slider-h w-28 shrink-0"
            style={{
              marginRight: '1rem',
              opacity: showVolumeSlider ? 1 : 0,
              transition: 'opacity 150ms ease-out',
              background: `linear-gradient(to right, #fff ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.3) ${(isMuted ? 0 : volume) * 100}%)`,
            }}
          />
        </div>

        {/* Author + caption overlay (bottom-left inside video) */}
        <div
          className="absolute bottom-5 left-4 right-16 z-10 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Author row */}
          <div className="flex items-center gap-2.5 mb-2">
            <button
              type="button"
              onClick={() => reel.author?.userId && navigate(`/profile/${reel.author.userId}`)}
              className="text-white font-bold text-[15px] drop-shadow-md hover:underline"
            >
              {reel.author?.displayName ?? 'Người dùng'}
            </button>
          </div>

          {/* Caption + hashtags */}
          {reel.caption && (
            <div>
              <p
                className={`text-[13px] leading-snug text-white drop-shadow-md ${
                  !captionExpanded && hasLongCaption ? 'line-clamp-1' : ''
                }`}
              >
                {reel.caption}
              </p>
              {hasLongCaption && !captionExpanded && (
                <button
                  type="button"
                  onClick={() => setCaptionExpanded(true)}
                  className="text-[13px] font-semibold text-white/80 hover:text-white mt-0.5"
                >
                  ... Xem thêm
                </button>
              )}
            </div>
          )}

          {reel.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {reel.hashtags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => navigate(`/search?q=%23${tag}`)}
                  className="text-[13px] font-semibold text-blue-300 drop-shadow-sm hover:text-blue-200"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Play/Pause icon overlay (centered on full container) */}
      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="size-20 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center animate-ping-once">
            <Play
              className={`size-10 text-white ${isPlaying ? 'hidden' : ''}`}
              fill="currentColor"
            />
          </div>
        </div>
      )}
    </div>
  );
};
