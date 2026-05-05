import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Volume2, VolumeX } from 'lucide-react';
import { useRecordReelViewMutation } from '@/store/api/newsfeedApi';
import type { IReel } from '@/types/newsfeed.types';

interface Props {
  reel: IReel;
  isVisible: boolean;
}

/**
 * Full-viewport HTML5 video player cho 1 reel.
 * - Autoplay khi visible, pause khi không
 * - Click to toggle play/pause
 * - Mute/unmute toggle
 * - Ghi nhận view sau 2s xem
 */
export const ReelPlayerFull = ({ reel, isVisible }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const viewRecordedRef = useRef(false);
  const watchStartRef = useRef<number | null>(null);

  const [recordView] = useRecordReelViewMutation();

  // Autoplay / pause dựa trên visibility
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
    }
  }, [isVisible]);

  // Ghi nhận view sau 2s xem (dedup client-side qua ref)
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

  const handleToggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => !prev);
  }, []);

  return (
    <div
      className="relative flex items-center justify-center w-full h-full bg-black cursor-pointer select-none"
      onClick={handleTogglePlay}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        poster={reel.thumbnailUrl}
        muted={isMuted}
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 w-full h-full object-contain"
      />

      {/* Gradient overlay bottom */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

      {/* Play/Pause icon overlay */}
      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="size-20 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center animate-ping-once">
            <Play
              className={`size-10 text-white ${isPlaying ? 'hidden' : ''}`}
              fill="currentColor"
            />
          </div>
        </div>
      )}

      {/* Mute toggle */}
      <button
        type="button"
        onClick={handleToggleMute}
        className="absolute bottom-5 right-20 z-20 size-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
        aria-label={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
      >
        {isMuted ? (
          <VolumeX className="size-4 text-white" />
        ) : (
          <Volume2 className="size-4 text-white" />
        )}
      </button>

      {/* Reel info overlay (bottom-left) */}
      <div className="absolute bottom-5 left-4 right-20 z-10 pointer-events-none">
        {/* Author */}
        <div className="flex items-center gap-2 mb-2 pointer-events-auto">
          {reel.author?.avatar ? (
            <img
              src={reel.author.avatar}
              alt={reel.author.displayName}
              className="size-10 rounded-full border-2 border-white/80 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="size-10 rounded-full border-2 border-white/80 bg-primary/80 flex items-center justify-center">
              <span className="text-sm font-bold text-white">
                {reel.author?.displayName?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            </div>
          )}
          <span className="text-white font-bold text-sm drop-shadow-md">
            {reel.author?.displayName ?? 'Người dùng'}
          </span>
        </div>

        {/* Caption */}
        {reel.caption && (
          <p className="text-white text-sm leading-snug drop-shadow-md line-clamp-3">
            {reel.caption}
          </p>
        )}

        {/* Hashtags */}
        {reel.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {reel.hashtags.map((tag) => (
              <span key={tag} className="text-xs text-blue-300 font-semibold">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
