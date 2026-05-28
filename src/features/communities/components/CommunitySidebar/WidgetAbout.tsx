import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe2, Calendar } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import type { ICommunity } from '@/types/community.types';
import type { IUser } from '@/types/user.types';
import { getInitials } from '../../utils/helpers';

export function WidgetAbout({
  community,
  ownerProfile,
}: {
  community: ICommunity;
  ownerProfile?: IUser;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const desc = community.description || 'Cộng đồng chưa có mô tả.';
  const shouldTruncate = desc.length > 100;
  const displayText = isExpanded ? desc : shouldTruncate ? desc.slice(0, 100) + '...' : desc;

  return (
    <Card className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:border-primary/20 transition-all duration-300">
      <div className="flex flex-col gap-3.5">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Giới thiệu nhóm
        </div>
        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-normal">
          {displayText}
          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors duration-150 cursor-pointer bg-transparent border-none p-0 focus:outline-none"
            >
              {isExpanded ? 'Thu gọn' : 'Xem thêm'}
            </button>
          )}
        </div>

        <div className="h-px bg-border/40 my-1" />

        <div className="flex flex-col gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2.5">
            <Globe2 className="size-4 shrink-0 text-slate-500" />
            <span className="font-medium">
              Nhóm{' '}
              <strong className="text-foreground">
                {community.type === 'public' ? 'Công khai' : 'Riêng tư'}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Calendar className="size-4 shrink-0 text-slate-500" />
            <span className="font-medium">
              Thành lập ngày{' '}
              <strong className="text-foreground">
                {new Date(community.createdAt).toLocaleDateString('vi-VN')}
              </strong>
            </span>
          </div>
        </div>

        {ownerProfile && (
          <>
            <div className="h-px bg-border/40 my-1" />
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 font-medium">Sáng lập bởi:</span>
              <Link
                to={`/profile/${ownerProfile.userId}`}
                className="flex items-center gap-2 font-bold text-foreground hover:text-primary transition-colors duration-150 cursor-pointer"
              >
                <Avatar className="size-5.5 border border-border/20 shadow-sm">
                  <AvatarImage
                    src={ownerProfile.avatar ?? undefined}
                    alt={ownerProfile.displayName}
                  />
                  <AvatarFallback className="text-[8px] font-bold">
                    {getInitials(ownerProfile.displayName) || 'O'}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[120px] font-semibold">
                  {ownerProfile.displayName}
                </span>
              </Link>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
