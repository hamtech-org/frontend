import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'motion/react';
import { Video, X, Globe, Users, Lock, ChevronDown, Hash, Type } from 'lucide-react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { store } from '@/store/store';
import type { RootState } from '@/store/store';
import { newsfeedApi } from '@/store/api/newsfeedApi';
import {
  uploadStarted,
  setProgress,
  uploadCompleted,
  uploadFailed,
} from '@/store/slices/reelUploadSlice';
import type { PostVisibility } from '@/types/newsfeed.types';

const VISIBILITY_CONFIG = {
  public: { icon: Globe, label: 'Công khai' },
  friends: { icon: Users, label: 'Bạn bè' },
  private: { icon: Lock, label: 'Chỉ mình tôi' },
} as const;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal tạo Reel mới trên web.
 * Flow: Chọn video → preview → nhập caption + hashtags → upload → POST /reels.
 */
export function CreateReelModal({ isOpen, onClose }: Props) {
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Local state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [hashtagsText, setHashtagsText] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [isVisOpen, setIsVisOpen] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoWidth, setVideoWidth] = useState(0);
  const [videoHeight, setVideoHeight] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const uploadStatus = useSelector((s: RootState) => s.reelUpload.status);
  const isUploading = uploadStatus === 'uploading';

  // Reset on open/close
  useEffect(() => {
    if (!isOpen) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setVideoFile(null);
      setPreviewUrl(null);
      setThumbnailUrl(null);
      setCaption('');
      setHashtagsText('');
      setVisibility('public');
      setVideoDuration(0);
      setVideoWidth(0);
      setVideoHeight(0);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle file selection
  const handleSelectVideo = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    if (!file.type.startsWith('video/')) return;

    // Revoke old preview
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
    setVideoFile(file);
    setThumbnailUrl(null);
  }, []);

  const handleVideoMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setVideoDuration(Math.round(video.duration * 1000));
    setVideoWidth(video.videoWidth);
    setVideoHeight(video.videoHeight);

    video.currentTime = Math.min(1, video.duration * 0.1);
  }, []);

  const handleVideoSeeked = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setThumbnailUrl(canvas.toDataURL('image/jpeg', 0.8));
    }
  }, []);

  // Submit — close modal immediately, upload in background via XHR
  const handleSubmit = useCallback(() => {
    if (!videoFile || isUploading) return;

    // Snapshot all state before modal closes/unmounts
    const file = videoFile;
    const thumbDataUrl = thumbnailUrl;
    const caption_ = caption;
    const hashtagsText_ = hashtagsText;
    const videoDuration_ = videoDuration;
    const videoWidth_ = videoWidth;
    const videoHeight_ = videoHeight;
    const visibility_ = visibility;

    store.dispatch(uploadStarted());
    onClose(); // close modal immediately

    const formData = new FormData();
    formData.append('mediaType', 'video');
    formData.append('deliveryScope', 'general');
    formData.append('file', file);

    const token = localStorage.getItem('accessToken');
    const apiBase =
      (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000/api/v1';

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${apiBase}/media/upload`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        store.dispatch(setProgress((e.loaded / e.total) * 0.85));
      }
    };

    xhr.onload = () => {
      void (async () => {
        try {
          const res = JSON.parse(xhr.responseText) as { data?: { url?: string } };
          const videoUrl = res?.data?.url;
          if (!videoUrl) throw new Error('Video upload failed');

          // Upload thumbnail via fetch (small file, no progress needed)
          let thumbUrl: string | undefined;
          if (thumbDataUrl) {
            const blob = await fetch(thumbDataUrl).then((r) => r.blob());
            const thumbFile = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
            const tf = new FormData();
            tf.append('mediaType', 'image');
            tf.append('deliveryScope', 'general');
            tf.append('file', thumbFile);
            const tRes = (await fetch(`${apiBase}/media/upload`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
              body: tf,
            }).then((r) => r.json())) as { data?: { url?: string } };
            thumbUrl = tRes?.data?.url ?? undefined;
          }
          store.dispatch(setProgress(0.95));

          const hashtags = hashtagsText_
            .split(/[,\s#]+/)
            .map((t) => t.trim())
            .filter(Boolean);
          const ratio =
            videoWidth_ && videoHeight_
              ? videoWidth_ / videoHeight_ < 0.7
                ? ('9:16' as const)
                : videoWidth_ / videoHeight_ < 0.9
                  ? ('4:5' as const)
                  : ('1:1' as const)
              : ('9:16' as const);

          const result = await store.dispatch(
            newsfeedApi.endpoints.createReel.initiate({
              videoUrl,
              thumbnailUrl: thumbUrl,
              caption: `${caption_}${hashtags.length > 0 ? '\n' + hashtags.map((h) => `#${h}`).join(' ') : ''}`,
              durationMs: videoDuration_,
              width: videoWidth_,
              height: videoHeight_,
              aspectRatio: ratio,
              visibility: visibility_,
            }),
          );

          if ('error' in result) throw new Error('Create reel failed');
          store.dispatch(uploadCompleted());
        } catch (e) {
          store.dispatch(uploadFailed(e instanceof Error ? e.message : 'Lỗi không xác định'));
        }
      })();
    };

    xhr.onerror = () => store.dispatch(uploadFailed('Lỗi kết nối mạng'));
    xhr.send(formData);
  }, [
    videoFile,
    isUploading,
    thumbnailUrl,
    caption,
    hashtagsText,
    videoDuration,
    videoWidth,
    videoHeight,
    visibility,
    onClose,
  ]);

  const displayName = currentUser?.displayName ?? '';
  const visConfig = VISIBILITY_CONFIG[visibility];
  const VisIcon = visConfig.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[520px] p-0 gap-0 rounded-2xl border border-border/50 overflow-hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="relative flex h-14 items-center justify-center border-b border-border px-12 shrink-0">
          <DialogTitle className="text-[17px] font-bold tracking-tight">Tạo Reel mới</DialogTitle>
          <button
            onClick={onClose}
            className="absolute right-3 flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground/60 transition-colors hover:bg-muted/80 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex max-h-[70vh] flex-col overflow-y-auto">
          {/* User row */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={currentUser?.avatar ?? undefined} />
              <AvatarFallback className="font-bold">{displayName.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <span className="text-[15px] font-semibold leading-none">{displayName}</span>
              <Popover open={isVisOpen} onOpenChange={setIsVisOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-[12px] font-semibold text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60">
                    <VisIcon className="h-3 w-3" />
                    {visConfig.label}
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-1.5 rounded-xl" align="start">
                  {(
                    Object.entries(VISIBILITY_CONFIG) as [
                      PostVisibility,
                      (typeof VISIBILITY_CONFIG)[PostVisibility],
                    ][]
                  ).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setVisibility(key);
                          setIsVisOpen(false);
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${visibility === key ? 'bg-muted' : ''}`}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {cfg.label}
                      </button>
                    );
                  })}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Video selector / preview */}
          <div className="px-4 pb-3">
            {previewUrl ? (
              <div className="relative rounded-2xl overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  src={previewUrl}
                  className="w-full max-h-80 object-contain rounded-2xl"
                  controls
                  muted
                  onLoadedMetadata={handleVideoMetadata}
                  onSeeked={handleVideoSeeked}
                />
                <button
                  onClick={() => {
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setVideoFile(null);
                    setPreviewUrl(null);
                    setThumbnailUrl(null);
                    setVideoDuration(0);
                    setVideoWidth(0);
                    setVideoHeight(0);
                  }}
                  className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                {videoDuration > 0 && (
                  <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white">
                    {Math.floor(videoDuration / 60000)}:
                    {String(Math.floor((videoDuration % 60000) / 1000)).padStart(2, '0')}
                  </div>
                )}
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 py-12 transition-colors hover:bg-muted/30 hover:border-primary/30">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Video className="h-8 w-8 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">Chọn video</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  MP4, WebM, MOV — Tối đa 10 phút
                </span>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(e) => handleSelectVideo(e.target.files)}
                />
              </label>
            )}
          </div>

          {/* Caption */}
          <div className="px-4 pb-3 space-y-3">
            <div>
              <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                <Type className="h-3.5 w-3.5" /> Mô tả
              </Label>
              <textarea
                value={caption}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCaption(e.target.value)}
                placeholder="Viết mô tả cho reel..."
                className="w-full rounded-xl bg-muted/40 border border-border/40 px-3 py-2 text-sm min-h-[80px] resize-none outline-none focus:ring-1 focus:ring-ring"
                maxLength={2200}
              />
            </div>

            <div>
              <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                <Hash className="h-3.5 w-3.5" /> Hashtags
              </Label>
              <Input
                value={hashtagsText}
                onChange={(e) => setHashtagsText(e.target.value)}
                placeholder="du lịch, ẩm thực, công nghệ..."
                className="rounded-xl bg-muted/40 border-border/40"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Ngăn cách bằng dấu phẩy hoặc khoảng trắng
              </p>
            </div>
          </div>

          {/* Thumbnail preview (hidden canvas) */}
          {thumbnailUrl && (
            <div className="px-4 pb-3">
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">
                Ảnh bìa (tự động)
              </Label>
              <img
                src={thumbnailUrl}
                alt="Thumbnail"
                className="h-24 w-auto rounded-xl object-cover border border-border/40"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 px-4 py-3">
          <button
            disabled={!videoFile || isUploading}
            onClick={handleSubmit}
            className={`h-10 w-full rounded-xl text-[15px] font-bold transition-all ${
              !videoFile || isUploading
                ? 'cursor-not-allowed bg-muted text-muted-foreground'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
            }`}
          >
            <AnimatePresence mode="wait">
              <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                Đăng Reel
              </motion.span>
            </AnimatePresence>
          </button>
        </div>

        {/* Hidden canvas for thumbnail generation */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
