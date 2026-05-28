import { useNavigate } from 'react-router-dom';

import { ZaloStyleAvatar } from '@/components/chat/ZaloStyleAvatar';
import { useGroupJoinLinkModalOptional } from '@/contexts/GroupJoinLinkModalContext';
import { useGetConversationsQuery, useGetGroupJoinPreviewQuery } from '@/store/api/chatApi';
import {
  joinLinkMessageDomain,
  type GroupJoinLinkMessagePayload,
} from '@/utils/groupJoinLinkMessage';
import { cn } from '@/utils/cn';
import { resolveGroupAvatarDisplayUrl } from '@/utils/groupAvatarUrl';

type GroupJoinLinkCardProps = {
  payload: GroupJoinLinkMessagePayload;
  className?: string;
};

const cardBase =
  'group/joinlink block w-full min-w-[260px] max-w-[min(100%,340px)] text-left rounded-xl overflow-hidden ' +
  'border border-sky-200/90 dark:border-sky-800/55 bg-sky-50/95 dark:bg-sky-950/35 shadow-sm ' +
  'transition-[border-color,box-shadow,background-color] duration-200 ' +
  'hover:border-[#0068ff]/45 hover:shadow-md hover:shadow-[#0068ff]/8 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0068ff]/35 cursor-pointer';

const urlRowBase =
  'px-3 py-2 border-b border-sky-100 dark:border-sky-800/50 ' +
  'bg-sky-50/80 dark:bg-sky-950/20 transition-colors duration-200 ' +
  'group-hover/joinlink:bg-[#0068ff]/[0.06] group-hover/joinlink:border-[#0068ff]/20';

const urlTextBase =
  'block text-[12px] leading-snug font-mono text-[#0068ff] truncate ' +
  'transition-[text-decoration-color,color] duration-200 ' +
  'group-hover/joinlink:underline group-hover/joinlink:underline-offset-[3px] ' +
  'group-hover/joinlink:decoration-[#0068ff]/70';

/** Thẻ preview link mời nhóm — đồng bộ sky box + primary #0068ff trong app. */
export function GroupJoinLinkCard({ payload, className }: GroupJoinLinkCardProps) {
  const navigate = useNavigate();
  const joinLinkModal = useGroupJoinLinkModalOptional();
  const domain = joinLinkMessageDomain(payload.url);
  const { data: conversationsRes } = useGetConversationsQuery();
  const { data: previewRes } = useGetGroupJoinPreviewQuery(payload.suffix, {
    skip: !payload.suffix,
  });
  const preview = previewRes?.data;
  const conversationId = preview?.conversationId ?? payload.conversationId;
  const liveConversation = conversationsRes?.data?.find((c) => c.conversationId === conversationId);
  const groupName =
    liveConversation?.name?.trim() || preview?.name || payload.groupName || 'Nhóm chat';
  const fallbackAvatar = conversationId
    ? `/api/v1/chat/conversations/${conversationId}/avatar`
    : null;
  const groupAvatar = resolveGroupAvatarDisplayUrl(
    liveConversation?.avatar ?? preview?.avatar ?? payload.groupAvatar ?? fallbackAvatar,
    {
      conversationId,
      updatedAt: liveConversation?.updatedAt,
    },
  );

  const openLink = () => {
    if (joinLinkModal) {
      joinLinkModal.openFromPayload(payload);
      return;
    }
    navigate(`/join/${payload.suffix}`);
  };

  return (
    <button
      type="button"
      title={`Mở link: ${payload.url}`}
      onClick={openLink}
      className={cn(cardBase, className)}
    >
      <JoinLinkUrlRow url={payload.url} />
      <JoinLinkCardBody
        payload={payload}
        domain={domain}
        groupName={groupName}
        groupAvatar={groupAvatar}
        conversationId={conversationId}
      />
    </button>
  );
}

function JoinLinkUrlRow({ url }: { url: string }) {
  return (
    <div className={urlRowBase}>
      <span className={urlTextBase}>{url}</span>
    </div>
  );
}

function JoinLinkCardBody({
  payload,
  domain,
  groupName,
  groupAvatar,
  conversationId,
}: {
  payload: GroupJoinLinkMessagePayload;
  domain: string;
  groupName: string;
  groupAvatar?: string;
  conversationId?: string;
}) {
  return (
    <div className="px-3 py-3 flex gap-3 items-start">
      <ZaloStyleAvatar
        userId={conversationId ?? payload.suffix}
        displayName={groupName}
        avatarUrl={groupAvatar}
        avatarUrlResolved
        className="size-11 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold leading-snug text-slate-900 dark:text-slate-50 line-clamp-2">
          {groupName}
        </p>
        <p className="mt-1.5 text-[13px] leading-snug text-slate-600 dark:text-slate-300 line-clamp-2">
          {payload.description ?? 'Bấm vào đây để tham gia nhóm trên HamTech'}
        </p>
        <p className="mt-2 text-[12px] font-medium text-slate-500 dark:text-slate-400">{domain}</p>
      </div>
    </div>
  );
}
