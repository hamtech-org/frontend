import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { IUser } from '@/types/user.types';
import { getInitials } from '../../utils/helpers';

export function WidgetAdminQuick({
  requests,
  userProfiles,
  onResolveRequest,
  resolveLoading,
}: {
  requests: Array<{ userId: string; requestedAt: string; message?: string }>;
  userProfiles: Record<string, IUser>;
  onResolveRequest: (userId: string, action: 'approve' | 'reject') => Promise<void>;
  resolveLoading: boolean;
}) {
  const pendingRequests = requests.filter((r) => r.userId);
  if (pendingRequests.length === 0) return null;

  const displayRequests = pendingRequests.slice(0, 2);

  return (
    <Card className="rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 backdrop-blur-xl p-5 shadow-[0_8px_30px_rgba(245,158,11,0.03)] transition-all duration-300 hover:border-amber-500/40">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <div className="size-2 rounded-full bg-amber-500 animate-pulse" />
            Yêu cầu gia nhập
          </div>
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none rounded-full px-2 py-0.5 text-[10px] h-5 flex items-center justify-center font-bold">
            {pendingRequests.length}
          </Badge>
        </div>

        <div className="flex flex-col gap-3.5 mt-1.5">
          {displayRequests.map((req) => {
            const profile = userProfiles[req.userId];
            const displayName = profile?.displayName ?? req.userId;
            const avatarUrl = profile?.avatar ?? undefined;

            return (
              <div
                key={req.userId}
                className="flex flex-col gap-2.5 rounded-xl border border-border/40 bg-card/70 backdrop-blur-md p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] transition-opacity duration-300"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-8.5 border border-border/20">
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="text-[10px] font-bold">
                      {getInitials(displayName) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold text-foreground">{displayName}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                      {new Date(req.requestedAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                </div>
                {req.message && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-muted/60 dark:bg-muted/30 rounded-lg p-2.5 leading-relaxed italic line-clamp-2">
                    "{req.message}"
                  </p>
                )}
                <div className="flex gap-2 mt-1 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7.5 text-[10px] px-3 rounded-lg border-border/60 hover:bg-muted font-semibold transition-colors duration-200 cursor-pointer"
                    disabled={resolveLoading}
                    onClick={() => onResolveRequest(req.userId, 'reject')}
                  >
                    Từ chối
                  </Button>
                  <Button
                    size="sm"
                    className="h-7.5 text-[10px] px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors duration-200 cursor-pointer border-none shadow-sm shadow-emerald-500/10"
                    disabled={resolveLoading}
                    onClick={() => onResolveRequest(req.userId, 'approve')}
                  >
                    Phê duyệt
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
