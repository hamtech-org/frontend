import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useGroupJoinLinkModal } from '@/contexts/GroupJoinLinkModalContext';
import { getJoinGroupUrl } from '@/utils/joinGroupUrl';

/**
 * Deep link `/join/:suffix`: mở cùng UI `GroupJoinLinkModal` (QR + link).
 * Không render trang landing riêng — chỉ đồng bộ URL ↔ modal và dọn modal khi rời route.
 */
export default function JoinGroupPage() {
  const { suffix = '' } = useParams<{ suffix: string }>();
  const navigate = useNavigate();
  const { openGroupJoinLinkModal, closeGroupJoinLinkModal } = useGroupJoinLinkModal();

  const normalizedSuffix = useMemo(() => suffix.trim().toLowerCase(), [suffix]);

  useEffect(() => {
    if (!normalizedSuffix) {
      navigate('/', { replace: true });
      return;
    }
    openGroupJoinLinkModal({
      suffix: normalizedSuffix,
      url: getJoinGroupUrl(normalizedSuffix),
      groupName: 'Nhóm chat',
      replacePathOnClose: '/',
    });
    return () => closeGroupJoinLinkModal();
  }, [normalizedSuffix, navigate, openGroupJoinLinkModal, closeGroupJoinLinkModal]);

  return <div className="min-h-[min(360px,50svh)]" aria-hidden />;
}
