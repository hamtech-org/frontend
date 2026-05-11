import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Globe, Users, Lock, ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSharePostMutation } from '@/store/api/newsfeedApi';
import type { RootState } from '@/store/store';
import type { IPost, PostVisibility } from '@/types/newsfeed.types';
import { SharedPostPreview } from './SharedPostPreview';

interface Props {
  open: boolean;
  post: IPost;
  onClose: () => void;
}

const VISIBILITY_OPTIONS: { value: PostVisibility; label: string; icon: React.ReactNode }[] = [
  { value: 'public', label: 'Công khai', icon: <Globe className="w-3.5 h-3.5" /> },
  { value: 'friends', label: 'Bạn bè', icon: <Users className="w-3.5 h-3.5" /> },
  { value: 'private', label: 'Chỉ mình tôi', icon: <Lock className="w-3.5 h-3.5" /> },
];

export const SharePostModal = ({ open, post, onClose }: Props) => {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>(
    post.visibility === 'private' ? 'friends' : post.visibility,
  );
  const [sharePost, { isLoading }] = useSharePostMutation();

  const displayName = currentUser?.displayName?.trim() || 'Bạn';
  const avatar = currentUser?.avatar;
  const initial = displayName.charAt(0).toUpperCase();
  const selectedOpt = VISIBILITY_OPTIONS.find((o) => o.value === visibility)!;

  const handleShare = async () => {
    try {
      const result = await sharePost({
        postId: post.postId,
        content: caption.trim() || undefined,
        visibility,
      }).unwrap();
      window.dispatchEvent(new CustomEvent('post:created', { detail: result.data }));
      setCaption('');
      onClose();
    } catch {
      // error handled by RTK Query
    }
  };

  const previewSource = post.sharedFrom ?? {
    postId: post.postId,
    authorId: post.authorId,
    content: post.content,
    mediaUrls: post.mediaUrls,
    type: post.type,
    author: post.author,
    createdAt: post.createdAt,
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        {/* ── Header: title căn giữa, pr-9 tránh đè nút X ── */}
        <DialogHeader>
          <DialogTitle className="text-center pr-2">Chia sẻ</DialogTitle>
        </DialogHeader>

        {/* ── User row ── */}
        <div className="flex items-center gap-2.5">
          <div className="size-10 rounded-full overflow-hidden bg-muted/60 flex items-center justify-center shrink-0">
            {avatar ? (
              <img
                src={avatar}
                alt={displayName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-sm font-bold text-muted-foreground">{initial}</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-bold leading-tight">{displayName}</p>
            <div className="flex items-center gap-1.5">
              {/* Đích đăng */}
              <span className="inline-flex items-center rounded-md bg-muted/70 px-2 py-0.5 text-xs font-semibold">
                Bảng feed
              </span>
              {/* Visibility */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-2 py-0.5 text-xs font-semibold hover:bg-muted transition-colors">
                    {selectedOpt.icon}
                    {selectedOpt.label}
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1.5 rounded-xl" align="start">
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${visibility === opt.value ? 'bg-muted' : ''}`}
                      onClick={() => setVisibility(opt.value)}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* ── Caption textarea ── */}
        <textarea
          autoFocus
          placeholder="Hãy nói gì đó về nội dung này..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={20000}
          rows={3}
          className="w-full resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground/60"
        />

        {/* ── Original post preview ── */}
        <SharedPostPreview sharedFrom={previewSource} />

        {/* ── Footer ── */}
        <DialogFooter>
          <Button
            className="w-full sm:w-full"
            onClick={() => void handleShare()}
            disabled={isLoading}
          >
            {isLoading ? 'Đang chia sẻ...' : 'Chia sẻ ngay'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
