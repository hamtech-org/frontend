import { Link } from 'react-router-dom';
import { Eye, ChevronRight } from 'lucide-react';
import type { LiveSessionListItem } from '@/store/api/liveApi';
import { getLiveCategoryLabel } from '@/store/api/liveApi';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/utils/cn';
import { zaloInitials } from '@/utils/avatarUtils';
import { formatLiveDuration, resolveLiveCoverBackground } from '@/utils/liveSessionUtils';

type LiveSessionCardProps = {
  session: LiveSessionListItem;
};

export function LiveSessionCard({ session }: LiveSessionCardProps) {
  const cover = resolveLiveCoverBackground({
    coverImageUrl: session.coverImageUrl,
    coverColor: session.coverColor,
    hostUserId: session.hostUserId,
  });
  const duration = formatLiveDuration(session.startedAt);
  const categoryLabel = getLiveCategoryLabel(session.category);

  return (
    <article
      className={cn(
        'flex flex-col rounded-2xl border border-border bg-card overflow-hidden',
        'shadow-sm hover:shadow-md transition-shadow',
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden">
        {cover.type === 'image' ? (
          <img src={cover.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: cover.background }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />

        <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          Live
        </span>

        <span className="absolute top-3 right-3 rounded-full bg-black/45 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
          {categoryLabel}
        </span>

        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2.5 text-white text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Eye className="h-3.5 w-3.5 opacity-90" />
            {session.viewerCount} đang xem
          </span>
          <span className="font-mono tabular-nums opacity-95">{duration}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <h2 className="font-semibold text-foreground line-clamp-2 leading-snug">{session.title}</h2>

        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar size="sm">
            {session.hostAvatar ? (
              <AvatarImage src={session.hostAvatar} alt={session.hostDisplayName} />
            ) : null}
            <AvatarFallback className="text-[10px] font-semibold">
              {zaloInitials(session.hostDisplayName, session.hostUserId)}
            </AvatarFallback>
          </Avatar>
          <p className="min-w-0 text-sm font-medium text-foreground truncate">
            {session.hostDisplayName}
          </p>
        </div>

        <Link
          to={`/live/${session.sessionId}`}
          className={cn(
            'flex items-center justify-center gap-1 w-full rounded-xl border border-border py-2.5',
            'text-sm font-medium text-primary hover:bg-muted/60 transition-colors',
          )}
        >
          Tham gia phòng
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
