import type { NavigateFunction } from 'react-router-dom';

import type { INotification } from '@/types/notification.types';

/** Điều hướng từ notification — hỗ trợ deepLink, entityType, route. */
export function navigateFromNotification(navigate: NavigateFunction, item: INotification): void {
  const data = item.data ?? {};

  const deepLink = typeof data.deepLink === 'string' ? data.deepLink.trim() : '';
  if (deepLink) {
    if (deepLink.startsWith('/')) {
      navigate(deepLink);
      return;
    }
    if (deepLink.startsWith('http')) {
      window.open(deepLink, '_blank', 'noopener,noreferrer');
      return;
    }
  }

  const entityType =
    (typeof data.entityType === 'string' && data.entityType) ||
    (typeof data.route === 'string' && data.route) ||
    '';
  const entityId = String(
    data.entityId ?? data.id ?? data.conversationId ?? data.postId ?? data.reelId ?? '',
  ).trim();

  switch (entityType) {
    case 'chat':
    case 'conversation':
    case 'message':
      if (entityId) navigate(`/chat/${encodeURIComponent(entityId)}`);
      else navigate('/chat');
      return;
    case 'post':
      if (entityId) navigate(`/?postId=${encodeURIComponent(entityId)}`);
      else navigate('/');
      return;
    case 'reel':
      if (entityId) navigate(`/reels/${encodeURIComponent(entityId)}`);
      else navigate('/reels');
      return;
    case 'friends':
    case 'friend':
      navigate('/community');
      return;
    case 'profile':
    case 'user':
      if (entityId) navigate(`/profile/${encodeURIComponent(entityId)}`);
      else navigate('/profile');
      return;
    case 'live':
      navigate('/studio');
      return;
    case 'ai':
      navigate('/ai-studio');
      return;
    default:
      if (entityId && data.route === 'chat') {
        navigate(`/chat/${encodeURIComponent(entityId)}`);
      }
      break;
  }
}
