import type { ISharedPostInfo } from '@/types/newsfeed.types';
import { formatRelative } from '@/utils/formatDate';
import { extractTextFromTiptapJson } from '@/utils/tiptapText';
import { HashtagText } from './HashtagText';

interface Props {
  sharedFrom: ISharedPostInfo;
}

export const SharedPostPreview = ({ sharedFrom }: Props) => {
  const initial = (sharedFrom.author?.displayName ?? sharedFrom.authorId).charAt(0).toUpperCase();

  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 overflow-hidden mt-2">
      <div className="px-3 py-2 flex items-center gap-2">
        <div className="size-7 rounded-full overflow-hidden bg-muted/60 flex items-center justify-center shrink-0">
          {sharedFrom.author?.avatar ? (
            <img
              src={sharedFrom.author.avatar}
              alt={sharedFrom.author.displayName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-xs font-bold text-muted-foreground">{initial}</span>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">
            {sharedFrom.author?.displayName ?? sharedFrom.authorId}
          </p>
          <p className="text-xs text-muted-foreground">{formatRelative(sharedFrom.createdAt)}</p>
        </div>
      </div>

      {sharedFrom.content && (
        <div className="px-3 pb-2 text-sm leading-6 whitespace-pre-wrap line-clamp-4">
          <HashtagText text={extractTextFromTiptapJson(sharedFrom.content)} />
        </div>
      )}

      {sharedFrom.mediaUrls && sharedFrom.mediaUrls.length > 0 && (
        <div className="relative w-full aspect-video bg-black/5 overflow-hidden">
          <img src={sharedFrom.mediaUrls[0]} alt="" className="w-full h-full object-cover" />
          {sharedFrom.mediaUrls.length > 1 && (
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
              +{sharedFrom.mediaUrls.length - 1}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
