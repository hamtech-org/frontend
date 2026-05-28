import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import type { IMessage } from '@/types/chat.types';

interface VoiceMessagePlayerProps {
  message: IMessage;
  isMe: boolean;
}

export function VoiceMessagePlayer({ message, isMe }: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLInputElement | null>(null);

  const duration = message.duration || 0;
  const audioUrl = message.mediaUrl || '';

  // Định dạng thời gian (ví dụ: 12.5 -> "0:12")
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    // Lắng nghe sự kiện dừng phát toàn cục
    const handleGlobalPlay = (e: Event) => {
      const customEvent = e as CustomEvent<{ messageId: string }>;
      if (customEvent.detail?.messageId !== message.messageId) {
        audio.pause();
        setIsPlaying(false);
      }
    };

    window.addEventListener('hamtech-voice-play', handleGlobalPlay);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      window.removeEventListener('hamtech-voice-play', handleGlobalPlay);
    };
  }, [audioUrl, message.messageId]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Bắn event để dừng tất cả các trình phát voice khác
      window.dispatchEvent(
        new CustomEvent('hamtech-voice-play', {
          detail: { messageId: message.messageId },
        }),
      );
      audioRef.current.play().catch((err) => {
        console.error('Không thể phát tin nhắn thoại:', err);
      });
      setIsPlaying(true);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const value = parseFloat(e.target.value);
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  return (
    <div
      className={`flex items-center gap-2.5 py-1.5 px-3 rounded-xl shadow-xs border select-none w-[200px] ${
        isMe
          ? 'bg-linear-to-br from-blue-600 to-blue-700 border-blue-500 text-white rounded-br-sm'
          : 'bg-white dark:bg-zinc-900 border-black/10 dark:border-white/10 text-foreground rounded-bl-sm'
      }`}
    >
      {/* Nút Play/Pause */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs transition-all active:scale-95 ${
          isMe
            ? 'bg-white/20 text-white hover:bg-white/30'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        title={isPlaying ? 'Tạm dừng' : 'Phát'}
      >
        {isPlaying ? (
          <Pause className="w-3.5 h-3.5 fill-current" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
        )}
      </button>

      {/* Slider & Thời gian */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <input
          ref={progressRef}
          type="range"
          min={0}
          max={duration || 1}
          value={currentTime}
          onChange={handleSliderChange}
          className={`w-full h-1 rounded-lg appearance-none cursor-pointer focus:outline-none ${
            isMe ? 'bg-white/30 accent-white' : 'bg-black/10 dark:bg-white/10 accent-blue-600'
          }`}
        />
        <span className="text-[9px] opacity-75 font-semibold leading-none mt-1">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
