import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { IConversation, IMessage, MessageStatus } from '@/types/chat.types';

interface ChatState {
  conversations: IConversation[];
  activeConversationId: string | null;
  messages: Record<string, IMessage[]>;
  typingUsers: Record<string, string[]>;
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

    setMessages: (state, action: PayloadAction<{ conversationId: string; messages: IMessage[] }>) => {
      state.messages[action.payload.conversationId] = action.payload.messages;
    },

    // ─── Socket event: tin nhắn mới nhận từ server ────────────────────────
    messageReceived: (state, action: PayloadAction<IMessage>) => {
      const msg = action.payload;
      if (!state.messages[msg.conversationId]) {
        state.messages[msg.conversationId] = [];
      }
      // Tránh thêm trùng lặp
      const exists = state.messages[msg.conversationId].some(
        (m) => m.messageId === msg.messageId,
      );
      if (!exists) {
        state.messages[msg.conversationId].push(msg);
      }

      // Cập nhật lastMessage trên conversation
      const conv = state.conversations.find((c) => c.conversationId === msg.conversationId);
      if (conv) {
        conv.lastMessage = {
          content: msg.content,
          senderId: msg.senderId,
          type: msg.type,
          createdAt: msg.createdAt,
        };
        // Tăng unread nếu không phải conversation đang active
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
      action: PayloadAction<{ conversationId: string; userId: string }>,
    ) => {
      const { conversationId, userId } = action.payload;
      if (!state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = [];
      }
      if (!state.typingUsers[conversationId].includes(userId)) {
        state.typingUsers[conversationId].push(userId);
      }
    },

    typingStopped: (
      state,
      action: PayloadAction<{ conversationId: string; userId: string }>,
    ) => {
      const { conversationId, userId } = action.payload;
      if (state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = state.typingUsers[conversationId].filter(
          (id) => id !== userId,
        );
      }
    },

    // ─── Reset unread khi mở conversation ────────────────────────────────
    resetUnread: (state, action: PayloadAction<string>) => {
      const conv = state.conversations.find((c) => c.conversationId === action.payload);
      if (conv) conv.unreadCount = 0;
    },

    // ─── Xóa tin nhắn khỏi state (optimistic) ────────────────────────────
    messageDeleted: (
      state,
      action: PayloadAction<{ messageId: string; conversationId: string }>,
    ) => {
      const { messageId, conversationId } = action.payload;
      if (state.messages[conversationId]) {
        state.messages[conversationId] = state.messages[conversationId].filter(
          (m) => m.messageId !== messageId,
        );
      }
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

    setTypingUser: (state, action: PayloadAction<{ conversationId: string; userId: string }>) => {
      const { conversationId, userId } = action.payload;
      if (!state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = [];
      }
      if (!state.typingUsers[conversationId].includes(userId)) {
        state.typingUsers[conversationId].push(userId);
      }
    },

    removeTypingUser: (state, action: PayloadAction<{ conversationId: string; userId: string }>) => {
      const { conversationId, userId } = action.payload;
      if (state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = state.typingUsers[conversationId].filter(
          (id) => id !== userId,
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
} = chatSlice.actions;

export default chatSlice.reducer;
