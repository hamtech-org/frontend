import type { ICommunity, CommunityMemberRole } from '@/types/community.types';
import type { IUser } from '@/types/user.types';
import { WidgetAbout } from './WidgetAbout';
import { WidgetAdminQuick } from './WidgetAdminQuick';
import { WidgetFeaturedMembers } from './WidgetFeaturedMembers';
import { WidgetRulesAccordion } from './WidgetRulesAccordion';

interface CommunitySidebarProps {
  community: ICommunity;
  members?: Array<{ userId: string; role: CommunityMemberRole; joinedAt: string }>;
  requests?: Array<{ userId: string; requestedAt: string; message?: string }>;
  userProfiles: Record<string, IUser>;
  isMember: boolean;
  canManage: boolean;
  onResolveRequest: (userId: string, action: 'approve' | 'reject') => Promise<void>;
  resolveLoading: boolean;
  onViewAllMembers: () => void;
}

export function CommunitySidebar({
  community,
  members = [],
  requests = [],
  userProfiles,
  canManage,
  onResolveRequest,
  resolveLoading,
  onViewAllMembers,
}: CommunitySidebarProps) {
  const ownerMember = members.find((m) => m.role === 'owner');
  const ownerProfile = ownerMember ? userProfiles[ownerMember.userId] : undefined;

  return (
    <div className="flex flex-col gap-4 sticky top-[80px] h-fit">
      <WidgetAbout community={community} ownerProfile={ownerProfile} />

      {canManage && community.joinPolicy === 'approval' && (
        <WidgetAdminQuick
          requests={requests}
          userProfiles={userProfiles}
          onResolveRequest={onResolveRequest}
          resolveLoading={resolveLoading}
        />
      )}

      <WidgetFeaturedMembers
        members={members}
        userProfiles={userProfiles}
        onViewAllMembers={onViewAllMembers}
      />

      <WidgetRulesAccordion rules={community.rules} />
    </div>
  );
}
export default CommunitySidebar;
