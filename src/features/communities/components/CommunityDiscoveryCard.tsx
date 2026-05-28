import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import defaultCoverGroup from '@/assets/images/cover-group-default.jpg';
import type { ICommunity } from '@/types/community.types';
import { CATEGORY_LABEL } from '../constants';

export function CommunityDiscoveryCard({
  community,
  onDismiss,
  onJoin,
  joining,
}: {
  community: ICommunity;
  onDismiss: () => void;
  onJoin: () => void;
  joining: boolean;
}) {
  const joined = community.viewerStatus === 'active';
  const requested = community.joinRequestStatus === 'pending';
  const cta = joined ? 'Đã tham gia' : requested ? 'Đã gửi yêu cầu' : 'Tham gia nhóm';

  return (
    <Link to={`/communities/${community.groupId}`} className="block group h-full">
      <Card className="overflow-hidden rounded-xl py-0 shadow-sm transition hover:shadow-md h-full flex flex-col">
        <div className="relative aspect-[16/9] bg-muted">
          <img
            src={community.coverUrl ?? defaultCoverGroup}
            alt={community.name}
            className="size-full object-cover"
          />
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            className="absolute right-3 top-3 rounded-full opacity-90 hover:opacity-100"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDismiss();
            }}
            aria-label="Ẩn gợi ý"
          >
            <X className="size-4" />
          </Button>
        </div>
        <CardContent className="flex flex-col gap-3 p-4 flex-1">
          <div className="flex flex-col gap-1 flex-1">
            <h3 className="line-clamp-2 text-base font-bold leading-snug text-foreground group-hover:text-primary transition-colors">
              {community.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {community.memberCount.toLocaleString('vi-VN')} thành viên ·{' '}
              {community.postCount || 0} bài viết
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{CATEGORY_LABEL[community.category]}</Badge>
            <span>{community.type === 'public' ? 'Công khai' : 'Riêng tư'}</span>
          </div>
          <Button
            variant={joined || requested ? 'secondary' : 'outline'}
            disabled={joining || joined || requested}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onJoin();
            }}
            className="mt-auto w-full"
          >
            {cta}
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}
