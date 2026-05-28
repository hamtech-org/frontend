import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useUploadMediaMultiMutation } from '@/store/api/mediaApi';
import { useCallback, useRef } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mediaUrls: string[];
  onMediaUrlsChange: (urls: string[]) => void;
  busy?: boolean;
}

/** Determines whether a URL is likely a video based on extension or mime markers. */
const isVideoUrl = (url: string): boolean =>
  /\.(mp4|webm|mov|avi|mkv)/i.test(url) || url.includes('video');

export function MediaManagerModal({
  isOpen,
  onClose,
  mediaUrls,
  onMediaUrlsChange,
  busy = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMulti, { isLoading: uploading }] = useUploadMediaMultiMutation();

  const handleAddFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      const remaining = 10 - mediaUrls.length;
      const batch = files.slice(0, remaining);
      if (batch.length === 0) return;

      try {
        const result = await uploadMulti({
          files: batch,
          deliveryScope: 'general',
        }).unwrap();

        const newUrls = (result.data ?? [])
          .map((r) => r.url?.trim())
          .filter((u): u is string => !!u);

        if (newUrls.length > 0) {
          const merged = [...mediaUrls];
          for (const url of newUrls) {
            if (!merged.includes(url)) merged.push(url);
          }
          onMediaUrlsChange(merged);
        }
      } catch (e) {
        console.error('Upload failed:', e);
      }
    },
    [mediaUrls, onMediaUrlsChange, uploadMulti],
  );

  const handleRemove = (index: number) => {
    onMediaUrlsChange(mediaUrls.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const arr = [...mediaUrls];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    onMediaUrlsChange(arr);
  };

  const handleMoveDown = (index: number) => {
    if (index >= mediaUrls.length - 1) return;
    const arr = [...mediaUrls];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    onMediaUrlsChange(arr);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[560px] p-0 overflow-hidden gap-0 rounded-2xl border border-border/50"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="relative flex h-14 items-center justify-center border-b border-border/60 px-12">
          <h2 className="text-[17px] font-bold tracking-tight">Chỉnh sửa media</h2>
          <button
            onClick={onClose}
            disabled={uploading}
            className="absolute right-3 flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground/60 transition-colors hover:bg-muted/80 hover:text-foreground disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex max-h-[60vh] flex-col overflow-y-auto p-4 space-y-3">
          {mediaUrls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <p className="text-sm">Chưa có media nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {mediaUrls.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="group relative overflow-hidden rounded-xl border border-border/40 bg-muted/20"
                >
                  {isVideoUrl(url) ? (
                    <video src={url} muted playsInline className="h-36 w-full object-cover" />
                  ) : (
                    <img
                      src={url}
                      alt={`Media ${index + 1}`}
                      className="h-36 w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  )}

                  {/* Overlay controls */}
                  <div className="absolute inset-0 flex items-start justify-between bg-gradient-to-b from-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100 p-2">
                    {/* Reorder */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-black/50 text-white transition-colors hover:bg-black/70 disabled:opacity-30"
                        title="Di chuyển lên"
                      >
                        <GripVertical className="h-3.5 w-3.5 rotate-180" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index >= mediaUrls.length - 1}
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-black/50 text-white transition-colors hover:bg-black/70 disabled:opacity-30"
                        title="Di chuyển xuống"
                      >
                        <GripVertical className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => handleRemove(index)}
                      className="flex h-7 w-7 items-center justify-center rounded-md bg-red-600/80 text-white transition-colors hover:bg-red-600"
                      title="Xóa"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Index badge */}
                  <div className="absolute bottom-1.5 left-1.5 flex h-5 min-w-5 items-center justify-center rounded-md bg-black/60 px-1 text-[10px] font-bold text-white">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add more button */}
          {mediaUrls.length < 10 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || busy}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-blue-500 hover:text-blue-500 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {uploading ? 'Đang tải lên...' : `Thêm media (${mediaUrls.length}/10)`}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files?.length) {
                void handleAddFiles(Array.from(files));
              }
              e.currentTarget.value = '';
            }}
          />
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 px-4 py-3">
          <button
            onClick={onClose}
            className="h-9 w-full rounded-lg bg-blue-600 text-[15px] font-bold text-white transition-colors hover:bg-blue-700"
          >
            Xong
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
