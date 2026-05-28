import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { ICommunity } from '@/types/community.types';
import { ROLE_LABEL } from '../constants';
import { CommunityAvatar } from './CommunityAvatar';

export function MiniCommunityRow({ community }: { community: ICommunity }) {
  return (
    <Link
      to={`/communities/${community.groupId}`}
      className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-muted"
    >
      <CommunityAvatar community={community} className="size-12 rounded-full" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">{community.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {community.viewerRole
            ? ROLE_LABEL[community.viewerRole]
            : `${community.memberCount} thành viên`}
        </div>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}
