import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import defaultAvatarGroup from '@/assets/images/avatar-group-default.jpg';
import type { ICommunity } from '@/types/community.types';
import { getInitials } from '../utils/helpers';

export function CommunityAvatar({
  community,
  className = 'size-12',
}: {
  community: ICommunity;
  className?: string;
}) {
  return (
    <Avatar className={`${className} rounded-full overflow-hidden`}>
      <AvatarImage
        src={community.avatar ?? defaultAvatarGroup}
        alt={community.name}
        className="rounded-full object-cover"
      />
      <AvatarFallback className="rounded-full">
        {getInitials(community.name) || 'CĐ'}
      </AvatarFallback>
    </Avatar>
  );
}
