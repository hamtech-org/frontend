import { createContext, useContext, useMemo } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { IConversation, IMessage } from '@/types/chat.types';
import type {
  GroupActionLoading,
  GroupMember,
  GroupMemberRole,
  GroupPoll,
  GroupRequest,
  GroupTask,
} from '@/types/chat.group.types';
import type { useGroupConversationController } from './hooks/useGroupConversationController';
import type { useDirectConversationActions } from './hooks/useDirectConversationActions';

// ── Context value shape ─────────────────────────────────────────────────

export interface ChatPageContextValue {
  /** Core identity & active conversation */
  core: {
    currentUserId: string;
    currentUserRole?: GroupMemberRole;
    activeConversationId: string | null;
    activeConversation?: IConversation;
  };

  /** Group data (members, polls, tasks, loading states) */
  group: {
    members: GroupMember[];
    requests: GroupRequest[];
    polls: GroupPoll[];
    tasks: GroupTask[];
    joinRequested: boolean;
    loading: { polls: boolean; tasks: boolean; recap: boolean };
    actionLoading: GroupActionLoading;
    setTasks: Dispatch<SetStateAction<GroupTask[]>>;
  };

  /** Messages (active conversation) — dùng cho modal/actions như ghim poll. */
  messages: IMessage[];

  /** All group action handlers (stable refs via useMemo+useCallback) */
  groupActions: ReturnType<typeof useGroupConversationController>;

  /** Direct conversation actions (create group, friend, call) */
  directActions: ReturnType<typeof useDirectConversationActions>;

  /** Message moderation actions */
  messageActions: {
    handleSaveEdit: () => void;
    handleRecallMsg: (msg: IMessage) => void;
    handleDeleteMsg: (msg: IMessage) => void;
    handleMessageConfirm: () => Promise<void>;
    handleTogglePinMsg: (msg: IMessage) => Promise<void>;
    handleReactMessage: (msg: IMessage, emoji: string) => Promise<void>;
  };
}

// ── Context ─────────────────────────────────────────────────────────────

const ChatPageContext = createContext<ChatPageContextValue | null>(null);

/**
 * Hook để child components truy cập shared data/actions
 * mà không cần prop drilling qua ChatPage.
 */
export function useChatPageContext(): ChatPageContextValue {
  const ctx = useContext(ChatPageContext);
  if (!ctx) {
    throw new Error('useChatPageContext must be used within ChatPageProvider');
  }
  return ctx;
}

// ── Provider ────────────────────────────────────────────────────────────

interface ChatPageProviderProps {
  children: ReactNode;
  value: ChatPageContextValue;
}

/**
 * Provider bao quanh JSX return trong ChatPage.
 * Value phải được memoize để tránh re-render không cần thiết.
 */
export function ChatPageProvider({ children, value }: ChatPageProviderProps) {
  return <ChatPageContext.Provider value={value}>{children}</ChatPageContext.Provider>;
}

// ── Helper: build memoized context value ────────────────────────────────

interface BuildChatPageContextParams {
  currentUserId: string;
  currentUserRole?: GroupMemberRole;
  activeConversationId: string | null;
  activeConversation?: IConversation;
  groupMembers: GroupMember[];
  groupRequests: GroupRequest[];
  groupPolls: GroupPoll[];
  groupTasks: GroupTask[];
  groupJoinRequested: boolean;
  groupLoading: { polls: boolean; tasks: boolean; recap: boolean };
  groupActionLoading: GroupActionLoading;
  setGroupTasks: Dispatch<SetStateAction<GroupTask[]>>;
  messages: IMessage[];
  groupActions: ReturnType<typeof useGroupConversationController>;
  directActions: ReturnType<typeof useDirectConversationActions>;
  messageActions: ChatPageContextValue['messageActions'];
}

/**
 * Hook tạo context value đã memoize.
 * Chỉ re-render consumers khi data thực sự thay đổi.
 */
export function useChatPageContextValue({
  currentUserId,
  currentUserRole,
  activeConversationId,
  activeConversation,
  groupMembers,
  groupRequests,
  groupPolls,
  groupTasks,
  groupJoinRequested,
  groupLoading,
  groupActionLoading,
  setGroupTasks,
  messages,
  groupActions,
  directActions,
  messageActions,
}: BuildChatPageContextParams): ChatPageContextValue {
  const core = useMemo(
    () => ({ currentUserId, currentUserRole, activeConversationId, activeConversation }),
    [currentUserId, currentUserRole, activeConversationId, activeConversation],
  );

  const group = useMemo(
    () => ({
      members: groupMembers,
      requests: groupRequests,
      polls: groupPolls,
      tasks: groupTasks,
      joinRequested: groupJoinRequested,
      loading: groupLoading,
      actionLoading: groupActionLoading,
      setTasks: setGroupTasks,
    }),
    [
      groupMembers,
      groupRequests,
      groupPolls,
      groupTasks,
      groupJoinRequested,
      groupLoading,
      groupActionLoading,
      setGroupTasks,
    ],
  );

  return useMemo(
    () => ({ core, group, messages, groupActions, directActions, messageActions }),
    [core, group, messages, groupActions, directActions, messageActions],
  );
}
