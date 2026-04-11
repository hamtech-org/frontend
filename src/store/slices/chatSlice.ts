import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { IConversation, IMessage, MessageStatus } from '@/types/chat.types';

export interface TypingUserEntry {
  userId: string;
  displayName: string;
}

interface ChatState {
  conversations: IConversation[];
  activeConversationId: string | null;
  messages: Record<string, IMessage[]>;
  typingUsers: Record<string, TypingUserEntry[]>;
}

const initialState: ChatState = {
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingUsers: {},
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<IConversation[]>) => {
      state.conversations = action.payload;
    },

    setActiveConversation: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
    },

    setMessages: (
      state,
      action: PayloadAction<{ conversationId: string; messages: IMessage[] }>,
    ) => {
      state.messages[action.payload.conversationId] = action.payload.messages;
    },

    // ─── Socket event: tin nhắn mới nhận từ server ────────────────────────
    messageReceived: (state, action: PayloadAction<IMessage>) => {
      const msg = action.payload;
      if (!state.messages[msg.conversationId]) {
        state.messages[msg.conversationId] = [];
      }
      // Tránh thêm trùng lặp
      const exists = state.messages[msg.conversationId].some((m) => m.messageId === msg.messageId);
      if (!exists) {
        state.messages[msg.conversationId].push(msg);
      }

      // Cập nhật lastMessage / unread chỉ khi tin chưa xử lý (tránh conv+user emit trùng)
      const conv = state.conversations.find((c) => c.conversationId === msg.conversationId);
      if (conv && !exists) {
        conv.lastMessage = {
          messageId: msg.messageId,
          content: msg.content,
          senderId: msg.senderId,
          type: msg.type,
          createdAt: msg.createdAt,
        };
        if (state.activeConversationId !== msg.conversationId) {
          conv.unreadCount = (conv.unreadCount ?? 0) + 1;
        }
      }
    },

    // ─── Socket event: tin nhắn bị thu hồi ───────────────────────────────
    messageRecalled: (
      state,
      action: PayloadAction<{ messageId: string; conversationId: string }>,
    ) => {
      const { messageId, conversationId } = action.payload;
      const messages = state.messages[conversationId];
      if (messages) {
        const msg = messages.find((m) => m.messageId === messageId);
        if (msg) {
          msg.isRecalled = true;
          msg.content = 'Tin nhắn đã được thu hồi';
          msg.isPinned = false;
        }
      }
    },

    // ─── Socket event / optimistic update: tin nhắn bị chỉnh sửa ────────
    messageEdited: (
      state,
      action: PayloadAction<{ messageId: string; conversationId: string; content: string }>,
    ) => {
      const { messageId, conversationId, content } = action.payload;
      const messages = state.messages[conversationId];
      if (messages) {
        const msg = messages.find((m) => m.messageId === messageId);
        if (msg) {
          msg.content = content;
          msg.isEdited = true;
        }
      }
    },

    // ─── Socket event: cập nhật trạng thái tin nhắn ───────────────────────
    messageStatusUpdated: (
      state,
      action: PayloadAction<{ messageId: string; conversationId: string; status: MessageStatus }>,
    ) => {
      const { messageId, conversationId, status } = action.payload;
      const messages = state.messages[conversationId];
      if (messages) {
        const msg = messages.find((m) => m.messageId === messageId);
        if (msg) msg.status = status;
      }
    },

    // ─── Typing indicators ────────────────────────────────────────────────
    typingStarted: (
      state,
      action: PayloadAction<{
        conversationId: string;
        userId: string;
        displayName?: string | null;
      }>,
    ) => {
      const { conversationId, userId, displayName } = action.payload;
      if (!state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = [];
      }
      const list = state.typingUsers[conversationId];
      const name = displayName?.trim() ?? '';
      const idx = list.findIndex((e) => e.userId === userId);
      if (idx >= 0) {
        if (name) list[idx].displayName = name;
      } else {
        list.push({ userId, displayName: name });
      }
    },

    typingStopped: (state, action: PayloadAction<{ conversationId: string; userId: string }>) => {
      const { conversationId, userId } = action.payload;
      if (state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = state.typingUsers[conversationId].filter(
          (e) => e.userId !== userId,
        );
      }
    },

    // ─── Reset unread khi mở conversation ────────────────────────────────
    resetUnread: (state, action: PayloadAction<string>) => {
      const conv = state.conversations.find((c) => c.conversationId === action.payload);
      if (conv) conv.unreadCount = 0;
    },

    // ─── Soft delete (đồng bộ với DynamoDB isDeleted) ─────────────────────
    messageDeleted: (
      state,
      action: PayloadAction<{ messageId: string; conversationId: string }>,
    ) => {
      const { messageId, conversationId } = action.payload;
      const messages = state.messages[conversationId];
      if (!messages) return;
      const msg = messages.find((m) => m.messageId === messageId);
      if (msg) {
        msg.isDeleted = true;
        msg.content = '';
        msg.isPinned = false;
      }
    },

    messagePinUpdated: (
      state,
      action: PayloadAction<{ messageId: string; conversationId: string; isPinned: boolean }>,
    ) => {
      const { messageId, conversationId, isPinned } = action.payload;
      const messages = state.messages[conversationId];
      if (!messages) return;
      const msg = messages.find((m) => m.messageId === messageId);
      if (msg) msg.isPinned = isPinned;
    },

    // Backward-compatible alias
    addMessage: (state, action: PayloadAction<IMessage>) => {
      const msg = action.payload;
      if (!state.messages[msg.conversationId]) {
        state.messages[msg.conversationId] = [];
      }
      const exists = state.messages[msg.conversationId].some((m) => m.messageId === msg.messageId);
      if (!exists) {
        state.messages[msg.conversationId].push(msg);
      }
    },
    setTypingUser: (
      state,
      action: PayloadAction<{ conversationId: string; userId: string; displayName?: string | null }>,
    ) => {
      const { conversationId, userId, displayName } = action.payload;
      if (!state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = [];
      }
      const list = state.typingUsers[conversationId];
      const name = displayName?.trim() ?? '';
      if (!list.some((e) => e.userId === userId)) {
        list.push({ userId, displayName: name });
      }
    },
    removeTypingUser: (
      state,
      action: PayloadAction<{ conversationId: string; userId: string }>,
    ) => {
      const { conversationId, userId } = action.payload;
      if (state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = state.typingUsers[conversationId].filter(
          (e) => e.userId !== userId,
        );
      }
    },
  },
});

export const {
  setConversations,
  setActiveConversation,
  addMessage,
  setMessages,
  setTypingUser,
  removeTypingUser,
  messageReceived,
  messageRecalled,
  messageEdited,
  messageStatusUpdated,
  typingStarted,
  typingStopped,
  resetUnread,
  messageDeleted,
  messagePinUpdated,
} = chatSlice.actions;

export default chatSlice.reducer;
