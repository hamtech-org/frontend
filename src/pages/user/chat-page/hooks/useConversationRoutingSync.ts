import { useEffect } from 'react';
import { setActiveConversation } from '@/store/slices/chatSlice';
import type { AppDispatch } from '@/store/store';

interface ConversationItem {
  conversationId: string;
}

interface UseConversationRoutingSyncParams {
  dispatch: AppDispatch;
  routeConversationId?: string;
  conversations: ConversationItem[];
  convsLoading: boolean;
  convsFetching: boolean;
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

export function useConversationRoutingSync({
  dispatch,
  routeConversationId,
  conversations,
  convsLoading,
  convsFetching,
  navigate,
}: UseConversationRoutingSyncParams): void {
  useEffect(() => {
    dispatch(setActiveConversation(routeConversationId ?? null));
  }, [routeConversationId, dispatch]);

  useEffect(() => {
    if (!routeConversationId) return;
    if (convsLoading || convsFetching) return;
    const exists = conversations.some((conversation) => conversation.conversationId === routeConversationId);
    if (!exists) {
      navigate('/chat', { replace: true });
    }
  }, [routeConversationId, convsLoading, convsFetching, conversations, navigate]);
}
