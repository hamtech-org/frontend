import { Crown, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { IUser } from '@/types/user.types';
import type { CommunityMemberRole } from '@/types/community.types';
import { getInitials } from '../../utils/helpers';

export function WidgetFeaturedMembers({
  members,
  userProfiles,
  onViewAllMembers,
}: {
  members: Array<{ userId: string; role: CommunityMemberRole; joinedAt: string }>;
  userProfiles: Record<string, IUser>;
  onViewAllMembers: () => void;
}) {
  if (!members || members.length === 0) return null;

  const staff = members.filter(
    (m) => m.role === 'owner' || m.role === 'admin' || m.role === 'moderator',
  );
  const normalMembers = members.filter((m) => m.role === 'member');

  const displayStaff = staff.slice(0, 3);
  const displayPile = normalMembers.slice(0, 6);
  const remainingCount = Math.max(0, members.length - staff.length - displayPile.length);

  return (
    <Card className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:border-primary/20 transition-all duration-300">
      <div className="flex flex-col gap-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
          <span>Ban quản trị & Thành viên</span>
          <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">
            {members.length} thành viên
          </span>
        </div>

        {displayStaff.length > 0 && (
          <div className="flex flex-col gap-2.5 mt-1.5">
            {displayStaff.map((st) => {
              const profile = userProfiles[st.userId];
              const displayName = profile?.displayName ?? st.userId;
              const avatarUrl = profile?.avatar ?? undefined;

              return (
                <div key={st.userId} className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="size-7.5 ring-1 ring-border/20 shadow-sm">
                      <AvatarImage src={avatarUrl} alt={displayName} />
                      <AvatarFallback className="text-[10px] font-bold">
                        {getInitials(displayName) || 'S'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-xs font-semibold text-foreground hover:text-primary transition-colors cursor-pointer">
                      {displayName}
                    </span>
                  </div>
                  <Badge
                    variant={st.role === 'owner' ? 'default' : 'secondary'}
                    className="h-4.5 text-[9px] px-1.5 py-0 rounded-md flex items-center gap-0.5 font-bold shrink-0"
                  >
                    {st.role === 'owner' ? (
                      <Crown className="size-2 text-yellow-500" />
                    ) : (
                      <ShieldCheck className="size-2" />
                    )}
                    {st.role === 'owner' ? 'Owner' : st.role === 'admin' ? 'Admin' : 'Mod'}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {displayStaff.length > 0 && displayPile.length > 0 && (
          <div className="h-px bg-border/40 my-1" />
        )}

        {displayPile.length > 0 && (
          <div className="flex items-center justify-between gap-3 mt-1.5">
            <div className="flex items-center -space-x-2 overflow-hidden">
              {displayPile.map((mb) => {
                const profile = userProfiles[mb.userId];
                const displayName = profile?.displayName ?? mb.userId;
                const avatarUrl = profile?.avatar ?? undefined;

                return (
                  <div
                    key={mb.userId}
                    className="relative group transition-all duration-200 hover:ring-2 hover:ring-primary/80 hover:z-10 cursor-pointer shrink-0 rounded-full"
                    title={displayName}
                  >
                    <Avatar className="size-7.5 border-2 border-card shadow-sm">
                      <AvatarImage src={avatarUrl} alt={displayName} />
                      <AvatarFallback className="text-[8px] font-bold">
                        {getInitials(displayName) || 'M'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                );
              })}
              {remainingCount > 0 && (
                <div className="size-7.5 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[9px] font-extrabold text-slate-500 ring-1 ring-border/10 shadow-sm shrink-0">
                  +{remainingCount}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onViewAllMembers}
              className="h-7.5 text-[10px] text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg px-2.5 font-bold cursor-pointer transition-colors duration-200"
            >
              Xem tất cả
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
