import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import EmojiPicker from 'emoji-picker-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Image as ImageIcon,
  MapPin,
  Smile,
  UserPlus,
  Lock,
  Globe,
  Users,
  ChevronDown,
  X,
  Pencil,
  ChevronLeft,
} from 'lucide-react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { RootState } from '@/store/store';
import { useCreatePostMutation, useUpdatePostMutation } from '@/store/api/newsfeedApi';
import { useUploadMediaMultiMutation } from '@/store/api/mediaApi';
import type { IPost, PostVisibility } from '@/types/newsfeed.types';
import TiptapPostEditor from '@/components/newsfeed/TiptapPostEditor';
import type { TiptapPostEditorHandle } from '@/components/newsfeed/TiptapPostEditor';
import { extractHashtags } from '@/features/newsfeed/utils/extractHashtags';
import { useTheme } from '@/contexts/ThemeContext';

const MAX_MEDIA = 10;

type View = 'editor' | 'mediaManager';

/** A media item staged locally (not yet uploaded) or already uploaded (remote URL). */
type MediaItem =
  | { kind: 'local'; file: File; previewUrl: string }
  | { kind: 'remote'; url: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  editingPost?: IPost;
  communityGroupId?: string;
};

const VISIBILITY_CONFIG = {
  public: { icon: Globe, label: 'Công khai' },
  friends: { icon: Users, label: 'Bạn bè' },
  private: { icon: Lock, label: 'Chỉ mình tôi' },
} as const;

/** Determines whether a URL is likely a video based on extension or mime markers. */
const isVideoUrl = (url: string): boolean =>
  /\.(mp4|webm|mov|avi|mkv)/i.test(url) || url.includes('video');

export function CreatePostModal({ isOpen, onClose, editingPost, communityGroupId }: Props) {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { theme } = useTheme();
  const isEdit = !!editingPost;

  const emptyTiptapJson = useMemo(
    () => JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] }),
    [],
  );

  const [currentView, setCurrentView] = useState<View>('editor');
  const [content, setContent] = useState<string>(emptyTiptapJson);
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [isVisOpen, setIsVisOpen] = useState(false);
  // Staged (local) + existing (remote) media items
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

  // Derived preview URLs for display in the editor
  const previewUrls = mediaItems.map((item) =>
    item.kind === 'local' ? item.previewUrl : item.url,
  );

  // Emoji picker state
  const [activeEmojiPicker, setActiveEmojiPicker] = useState<'main' | 'bottom' | null>(null);

  // Draft dialog state
  const [showDraftDialog, setShowDraftDialog] = useState(false);

  // Editor ref
  const editorRef = useRef<TiptapPostEditorHandle>(null);

  const hasContent = content !== emptyTiptapJson || mediaItems.length > 0;
  const postType: 'text' | 'image' | 'video' | 'link' = mediaItems.length > 0 ? 'image' : 'text';

  const [createPost, { isLoading: creating }] = useCreatePostMutation();
  const [updatePost, { isLoading: updating }] = useUpdatePostMutation();
  const [uploadMulti, { isLoading: uploading }] = useUploadMediaMultiMutation();

  // Revoke all local blob URLs to prevent memory leaks
  const revokeLocalUrls = (items: MediaItem[]) => {
    items.forEach((item) => {
      if (item.kind === 'local') URL.revokeObjectURL(item.previewUrl);
    });
  };

  useEffect(() => {
    if (!isOpen) {
      // Cleanup blob URLs when modal is closed
      setMediaItems((prev) => {
        revokeLocalUrls(prev);
        return prev;
      });
      return;
    }
    setCurrentView('editor');
    if (editingPost) {
      setContent(editingPost.content ?? '');
      setVisibility(editingPost.visibility);
      // Existing media URLs become 'remote' items
      setMediaItems((editingPost.mediaUrls ?? []).map((url) => ({ kind: 'remote' as const, url })));
    } else {
      setContent(emptyTiptapJson);
      setVisibility('public');
      setMediaItems([]);
    }
    setActiveEmojiPicker(null);
    setShowDraftDialog(false);
  }, [isOpen, editingPost, emptyTiptapJson]);

  /** Stage files locally – NO upload yet. Preview via blob URLs. */
  const handleSelectFiles = (files: File[]) => {
    if (!files.length) return;
    setMediaItems((prev) => {
      const remaining = MAX_MEDIA - prev.length;
      const batch = files.slice(0, remaining);
      const newItems: MediaItem[] = batch.map((file) => ({
        kind: 'local',
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      return [...prev, ...newItems].slice(0, MAX_MEDIA);
    });
  };

  /** Remove a media item and revoke its blob URL if local. */
  const removeMediaItem = (index: number) => {
    setMediaItems((prev) => {
      const item = prev[index];
      if (item?.kind === 'local') URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  /** Upload all local items and return the final ordered mediaUrls array. */
  const buildFinalMediaUrls = async (): Promise<string[]> => {
    const localItems = mediaItems.filter(
      (item): item is Extract<MediaItem, { kind: 'local' }> => item.kind === 'local',
    );

    let uploadedUrls: string[] = [];
    if (localItems.length > 0) {
      const result = await uploadMulti({
        files: localItems.map((item) => item.file),
        deliveryScope: 'general',
      }).unwrap();
      uploadedUrls = (result.data ?? []).map((r) => r.url?.trim()).filter((u): u is string => !!u);
    }

    // Reconstruct the final array preserving insertion order
    let uploadedIdx = 0;
    return mediaItems
      .map((item) => {
        if (item.kind === 'remote') return item.url;
        return uploadedUrls[uploadedIdx++] ?? null;
      })
      .filter((u): u is string => !!u);
  };

  const busy = creating || updating || uploading;
  const isSubmitDisabled = busy || !hasContent;

  const buildPayload = async (status: 'published' | 'draft') => {
    const tags = extractHashtags(content);
    const finalMediaUrls = await buildFinalMediaUrls();
    return {
      content,
      type: postType,
      visibility,
      publicationStatus: status,
      ...(communityGroupId ? { groupId: communityGroupId, communityId: communityGroupId } : {}),
      categories: [] as string[],
      tags,
      mediaUrls: finalMediaUrls,
    };
  };

  const onSubmit = async () => {
    if (isSubmitDisabled) return;
    try {
      const payload = await buildPayload('published');
      if (isEdit && editingPost?.postId) {
        await updatePost({ postId: editingPost.postId, data: payload }).unwrap();
        window.dispatchEvent(
          new CustomEvent('post:updated', {
            detail: { postId: editingPost.postId, ...payload },
          }),
        );
      } else {
        const res = await createPost(payload).unwrap();
        if (res.data) {
          window.dispatchEvent(new CustomEvent('post:created', { detail: res.data }));
        }
      }
      onClose();
    } catch (e) {
      console.error('Submit post error:', e);
    }
  };

  const onSaveDraft = async () => {
    try {
      const payload = await buildPayload('draft');
      if (isEdit && editingPost?.postId) {
        await updatePost({ postId: editingPost.postId, data: payload }).unwrap();
        window.dispatchEvent(
          new CustomEvent('post:updated', {
            detail: { postId: editingPost.postId, ...payload },
          }),
        );
      } else {
        await createPost(payload).unwrap();
      }
    } catch (e) {
      console.error('Save draft error:', e);
    }
    setShowDraftDialog(false);
    onClose();
  };

  // Intercept close – show draft dialog if there's unsaved content
  const handleRequestClose = () => {
    if (hasContent && !isEdit) {
      setShowDraftDialog(true);
    } else {
      onClose();
    }
  };

  const handleEmojiClick = (emojiObject: { emoji: string }) => {
    editorRef.current?.insertContent(emojiObject.emoji);
    setActiveEmojiPicker(null);
  };

  const visConfig = VISIBILITY_CONFIG[visibility];
  const VisIcon = visConfig.icon;

  const displayName = currentUser?.displayName ?? '';
  const firstName = displayName.split(' ').pop() || 'Bạn';
  const placeholder = `${firstName} ơi, bạn đang nghĩ gì thế?`;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleRequestClose()}>
        <DialogContent
          className="sm:max-w-[500px] p-0 gap-0 rounded-2xl border border-border/50 overflow-hidden"
          showCloseButton={false}
        >
          {/* ── Header ── */}
          <div className="relative flex h-14 items-center justify-center border-b border-border px-12 shrink-0">
            <AnimatePresence mode="wait">
              {currentView === 'mediaManager' ? (
                <motion.button
                  key="back"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  onClick={() => setCurrentView('editor')}
                  className="absolute left-3 flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground/60 transition-colors hover:bg-muted/80 hover:text-foreground"
                >
                  <ChevronLeft className="h-5 w-5" />
                </motion.button>
              ) : null}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <DialogTitle asChild>
                <motion.h2
                  key={currentView}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="text-[17px] font-bold tracking-tight"
                >
                  {currentView === 'mediaManager'
                    ? 'Chỉnh sửa ảnh và video'
                    : isEdit
                      ? 'Chỉnh sửa bài viết'
                      : 'Tạo bài viết'}
                </motion.h2>
              </DialogTitle>
            </AnimatePresence>

            <button
              onClick={handleRequestClose}
              disabled={busy}
              className="absolute right-3 flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground/60 transition-colors hover:bg-muted/80 hover:text-foreground disabled:opacity-40"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ── Animated Views ── */}
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              {currentView === 'editor' ? (
                <motion.div
                  key="editor"
                  initial={{ x: '-100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '-100%', opacity: 0 }}
                  transition={{ type: 'tween', duration: 0.22, ease: 'easeInOut' }}
                >
                  {/* ── Editor Body ── */}
                  <div className="flex max-h-[65vh] flex-col overflow-y-auto">
                    {/* User row */}
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={currentUser?.avatar ?? undefined} />
                        <AvatarFallback className="font-bold">
                          {displayName.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-1">
                        <span className="text-[15px] font-semibold leading-none">
                          {displayName}
                        </span>
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
                                typeof visConfig,
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

                    {/* Editor */}
                    <div className="px-4 pb-2">
                      <TiptapPostEditor
                        ref={editorRef}
                        value={content}
                        onChange={setContent}
                        placeholderText={placeholder}
                      />
                    </div>

                    {/* Emoji trigger row */}
                    <div className="relative flex justify-end px-4 pb-3">
                      <Popover
                        open={activeEmojiPicker === 'main'}
                        onOpenChange={(open) => setActiveEmojiPicker(open ? 'main' : null)}
                      >
                        <PopoverTrigger asChild>
                          <button className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted">
                            <Smile className="h-5 w-5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          side="top"
                          align="end"
                          className="w-auto p-0 border-none shadow-none bg-transparent"
                          sideOffset={8}
                        >
                          <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            theme={theme as any}
                            width={320}
                            height={380}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Media gallery preview */}
                    {previewUrls.length > 0 && (
                      <div className="mx-4 mb-3">
                        <div
                          className={`grid gap-1.5 rounded-xl overflow-hidden ${
                            previewUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                          }`}
                        >
                          {mediaItems.slice(0, 4).map((item, index) => {
                            const url = item.kind === 'local' ? item.previewUrl : item.url;
                            const isVideo =
                              item.kind === 'local'
                                ? item.file.type.startsWith('video/')
                                : isVideoUrl(item.url);
                            return (
                              <div
                                key={`preview-${index}`}
                                className={`relative overflow-hidden bg-muted/30 ${
                                  previewUrls.length === 1
                                    ? 'max-h-72'
                                    : previewUrls.length === 3 && index === 0
                                      ? 'row-span-2 h-full'
                                      : 'h-36'
                                }`}
                              >
                                {isVideo ? (
                                  <div className="relative h-full w-full bg-black">
                                    <video
                                      src={`${url}#t=0.001`}
                                      controls
                                      preload="metadata"
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <img
                                    src={url}
                                    alt={`preview ${index + 1}`}
                                    className="h-full w-full object-cover"
                                  />
                                )}
                                {/* Remove button on preview */}
                                <button
                                  onClick={() => removeMediaItem(index)}
                                  className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                                {/* Badge: local = unsaved, remote = uploaded */}
                                {item.kind === 'local' && (
                                  <span className="absolute bottom-1.5 left-1.5 rounded bg-orange-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
                                    Chưa lưu
                                  </span>
                                )}
                                {index === 3 && previewUrls.length > 4 && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                    <span className="text-xl font-bold text-white">
                                      +{previewUrls.length - 4}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => setCurrentView('mediaManager')}
                          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-border/60 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Chỉnh sửa ({previewUrls.length}/{MAX_MEDIA})
                        </button>
                      </div>
                    )}

                    {/* Add to post bar */}
                    <div className="mx-4 mb-4 flex items-center justify-between rounded-xl border border-border px-3 py-2">
                      <span className="text-[14px] font-semibold text-foreground/80">
                        Thêm vào bài viết
                      </span>
                      <div className="flex items-center gap-0.5">
                        {/* Image/Video upload */}
                        <label className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-muted">
                          <ImageIcon className="h-5 w-5 text-green-500" />
                          <input
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            className="absolute inset-0 cursor-pointer opacity-0"
                            disabled={mediaItems.length >= MAX_MEDIA}
                            onChange={(e) => {
                              const files = e.target.files;
                              if (files?.length) handleSelectFiles(Array.from(files));
                              e.currentTarget.value = '';
                            }}
                          />
                        </label>

                        <button className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted">
                          <UserPlus className="h-5 w-5 text-blue-500" />
                        </button>

                        <Popover
                          open={activeEmojiPicker === 'bottom'}
                          onOpenChange={(open) => setActiveEmojiPicker(open ? 'bottom' : null)}
                        >
                          <PopoverTrigger asChild>
                            <button className="hidden h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted sm:flex">
                              <Smile className="h-5 w-5 text-yellow-500" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            side="top"
                            align="center"
                            className="w-auto p-0 border-none shadow-none bg-transparent"
                            sideOffset={8}
                          >
                            <EmojiPicker
                              onEmojiClick={handleEmojiClick}
                              theme={theme as any}
                              width={320}
                              height={380}
                            />
                          </PopoverContent>
                        </Popover>

                        <button className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted">
                          <MapPin className="h-5 w-5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Footer / Submit ── */}
                  <div className="border-t border-border/50 px-4 py-3">
                    <button
                      disabled={isSubmitDisabled}
                      onClick={() => void onSubmit()}
                      className={`h-9 w-full rounded-lg text-[15px] font-bold transition-colors ${
                        isSubmitDisabled
                          ? 'cursor-not-allowed bg-muted text-muted-foreground'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {busy ? 'Đang xử lý...' : isEdit ? 'Lưu' : 'Đăng'}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="mediaManager"
                  initial={{ x: '100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '100%', opacity: 0 }}
                  transition={{ type: 'tween', duration: 0.22, ease: 'easeInOut' }}
                >
                  {/* ── Media Manager View ── */}
                  <div className="flex max-h-[65vh] flex-col overflow-y-auto px-4 py-3">
                    {mediaItems.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        Chưa có media nào
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {mediaItems.map((item, index) => {
                          const url = item.kind === 'local' ? item.previewUrl : item.url;
                          const isVideo =
                            item.kind === 'local'
                              ? item.file.type.startsWith('video/')
                              : isVideoUrl(item.url);
                          return (
                            <div
                              key={`manage-${index}`}
                              className="relative aspect-square overflow-hidden rounded-xl bg-muted/30"
                            >
                              {isVideo ? (
                                <div className="relative h-full w-full bg-black">
                                  <video
                                    src={`${url}#t=0.001`}
                                    controls
                                    preload="metadata"
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : (
                                <img
                                  src={url}
                                  alt={`media ${index + 1}`}
                                  className="h-full w-full object-cover"
                                />
                              )}
                              <div className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1 py-0.5 text-[10px] font-bold text-white">
                                {index + 1}
                              </div>
                              {item.kind === 'local' && (
                                <span className="absolute bottom-1.5 right-7 rounded bg-orange-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
                                  Chưa lưu
                                </span>
                              )}
                              <button
                                onClick={() => removeMediaItem(index)}
                                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-600/80 text-white hover:bg-red-600"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {mediaItems.length < MAX_MEDIA && (
                      <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border/60 py-4 transition-colors hover:bg-muted/30">
                        <span className="text-sm font-medium text-muted-foreground">
                          + Thêm media ({mediaItems.length}/{MAX_MEDIA})
                        </span>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          className="hidden"
                          disabled={mediaItems.length >= MAX_MEDIA}
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files?.length) handleSelectFiles(Array.from(files));
                            e.currentTarget.value = '';
                          }}
                        />
                      </label>
                    )}
                  </div>

                  <div className="border-t border-border/50 px-4 py-3">
                    <button
                      onClick={() => setCurrentView('editor')}
                      className="h-9 w-full rounded-lg bg-blue-600 text-[15px] font-bold text-white transition-colors hover:bg-blue-700"
                    >
                      Xong
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Draft Dialog ── */}
      <AlertDialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lưu bản nháp?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có muốn lưu bài viết này vào mục nháp để tiếp tục chỉnh sửa sau không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel
              onClick={() => {
                setShowDraftDialog(false);
                onClose();
              }}
            >
              Bỏ qua
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void onSaveDraft()}
              disabled={busy}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {busy ? 'Đang lưu...' : 'Lưu nháp'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
