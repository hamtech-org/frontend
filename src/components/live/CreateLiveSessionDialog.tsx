import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Upload, Check, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LIVE_CATEGORIES,
  LIVE_COVER_COLORS,
  getLiveCategoryLabel,
  useCreateLiveSessionMutation,
  type LiveCategory,
  type LiveCoverColor,
} from '@/store/api/liveApi';
import { useUploadMediaMutation } from '@/store/api/mediaApi';
import { cn } from '@/utils/cn';
import { resolveLiveCoverBackground } from '@/utils/liveSessionUtils';

const COVER_COLOR_KEYS = Object.keys(LIVE_COVER_COLORS) as LiveCoverColor[];

type CreateLiveSessionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateLiveSessionDialog({ open, onOpenChange }: CreateLiveSessionDialogProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<LiveCategory>('other');
  const [coverMode, setCoverMode] = useState<'color' | 'image'>('color');
  const [coverColor, setCoverColor] = useState<LiveCoverColor>('blue');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  const [createSession, { isLoading: creating }] = useCreateLiveSessionMutation();
  const [uploadMedia, { isLoading: uploading }] = useUploadMediaMutation();

  const resetForm = useCallback(() => {
    setTitle('');
    setCategory('other');
    setCoverMode('color');
    setCoverColor('blue');
    setCoverFile(null);
    setCoverPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  useEffect(() => {
    if (!open) resetForm();
  }, [open, resetForm]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const previewCover = resolveLiveCoverBackground({
    coverImageUrl: coverMode === 'image' && coverPreviewUrl ? coverPreviewUrl : undefined,
    coverColor: coverMode === 'color' ? coverColor : undefined,
    hostUserId: 'preview',
  });

  const previewTitle = title.trim() || 'Tên phiên phát sóng hiển thị ở đây';
  const categoryLabel = getLiveCategoryLabel(category).toUpperCase();
  const isSubmitting = creating || uploading;

  const handlePickColor = (color: LiveCoverColor) => {
    setCoverMode('color');
    setCoverColor(color);
    setCoverFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ chấp nhận file ảnh');
      return;
    }
    setCoverMode('image');
    setCoverFile(file);
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.warn('Vui lòng nhập tên phiên live');
      return;
    }

    try {
      let coverImageUrl: string | undefined;
      if (coverMode === 'image' && coverFile) {
        const uploaded = await uploadMedia({
          file: coverFile,
          mediaType: 'image',
          deliveryScope: 'general',
        }).unwrap();
        coverImageUrl = uploaded.data.url;
      }

      const session = await createSession({
        title: trimmedTitle,
        category,
        ...(coverImageUrl ? { coverImageUrl } : {}),
        ...(coverMode === 'color' ? { coverColor } : {}),
      }).unwrap();

      toast.success('Đã tạo phiên live');
      onOpenChange(false);
      navigate(`/live/${session.sessionId}/studio`, { replace: true });
    } catch {
      toast.error('Không tạo được phiên live');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Thiết lập phòng phát sóng mới
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tên phiên livestream
            </span>
            <input
              className={cn(
                'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm',
                'outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              placeholder="Ví dụ: Giới thiệu giao diện Live Stream Studio mới cùng HamTech"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Danh mục chủ đề
            </span>
            <Select value={category} onValueChange={(v) => setCategory(v as LiveCategory)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIVE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Chọn ảnh bìa phòng livestream
            </span>

            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border">
              {previewCover.type === 'image' ? (
                <img
                  src={previewCover.url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0" style={{ background: previewCover.background }} />
              )}
              <div className="absolute inset-0 bg-black/25" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-white">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                  <Radio className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold line-clamp-2 drop-shadow">{previewTitle}</p>
                <span className="rounded-full bg-white/20 px-3 py-0.5 text-[10px] font-semibold tracking-wide backdrop-blur-sm">
                  {categoryLabel} · ĐANG LIVE
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {COVER_COLOR_KEYS.map((color) => (
                <button
                  key={color}
                  type="button"
                  title={color}
                  onClick={() => handlePickColor(color)}
                  className={cn(
                    'relative h-10 w-10 shrink-0 rounded-xl border-2 transition-all',
                    coverMode === 'color' && coverColor === color
                      ? 'border-primary scale-105'
                      : 'border-transparent hover:border-border',
                  )}
                  style={{ background: LIVE_COVER_COLORS[color] }}
                >
                  {coverMode === 'color' && coverColor === color && (
                    <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
                  )}
                </button>
              ))}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'flex h-10 min-w-[7rem] items-center justify-center gap-1.5 rounded-xl border border-dashed border-border px-3',
                  'text-xs font-medium text-muted-foreground hover:bg-muted/60 transition-colors',
                  coverMode === 'image' && coverFile && 'border-primary text-primary',
                )}
              >
                <Upload className="h-3.5 w-3.5" />
                Tải ảnh
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Huỷ bỏ
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={() => void handleSubmit()}>
            <Radio className="h-4 w-4" />
            {isSubmitting ? 'Đang tạo…' : 'Bắt đầu phát sóng'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
