import { Image as ImageIcon, Smile, Video } from 'lucide-react';

interface Props {
  createPostName: string;
  createPostAvatar: string;
  createPostInitial: string;
  onCreatePost: () => void;
  onCreateReel?: () => void;
}

export const CreatePostPromptCard = ({
  createPostName,
  createPostAvatar,
  createPostInitial,
  onCreatePost,
  onCreateReel,
}: Props) => (
  <div className="rounded-2xl border border-border/40 bg-card px-4 py-3">
    <div className="flex items-center gap-2.5">
      <div className="size-10 rounded-full bg-muted/40 flex items-center justify-center shrink-0 overflow-hidden">
        {createPostAvatar ? (
          <img
            src={createPostAvatar}
            alt={createPostName}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-sm font-bold text-muted-foreground">{createPostInitial}</span>
        )}
      </div>
      <button
        type="button"
        className="min-w-0 flex-1 truncate rounded-full bg-muted/50 px-4 py-2.5 text-left text-base text-muted-foreground"
        onClick={onCreatePost}
      >
        {createPostName} ơi, bạn đang nghĩ gì thế?
      </button>
      <button
        type="button"
        className="p-1.5 text-rose-500 hover:opacity-80"
        onClick={onCreateReel ?? onCreatePost}
      >
        <Video className="w-5 h-5" />
      </button>
      <button
        type="button"
        className="p-1.5 text-green-600 hover:opacity-80"
        onClick={onCreatePost}
      >
        <ImageIcon className="w-5 h-5" />
      </button>
      <button
        type="button"
        className="p-1.5 text-amber-500 hover:opacity-80"
        onClick={onCreatePost}
      >
        <Smile className="w-5 h-5" />
      </button>
    </div>
  </div>
);
