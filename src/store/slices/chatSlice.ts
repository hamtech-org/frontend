import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { IConversation, IMessage } from '@/types/chat.types';

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
    addMessage: (state, action: PayloadAction<IMessage>) => {
      const msg = action.payload;
      if (!state.messages[msg.conversationId]) {
        state.messages[msg.conversationId] = [];
      }
      state.messages[msg.conversationId].push(msg);
    },
    setMessages: (state, action: PayloadAction<{ conversationId: string; messages: IMessage[] }>) => {
      state.messages[action.payload.conversationId] = action.payload.messages;
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
        state.typingUsers[conversationId] = state.typingUsers[conversationId].filter((id) => id !== userId);
      }
    },
  },
});

export const { setConversations, setActiveConversation, addMessage, setMessages, setTypingUser, removeTypingUser } = chatSlice.actions;
export default chatSlice.reducer;
