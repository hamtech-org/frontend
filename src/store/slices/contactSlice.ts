import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { IUserPublic } from '@/types/user.types';

interface ContactState {
  friends: IUserPublic[];
  pendingRequests: IUserPublic[];
}

const initialState: ContactState = {
  friends: [],
  pendingRequests: [],
};

const contactSlice = createSlice({
  name: 'contact',
  initialState,
  reducers: {
    setFriends: (state, action: PayloadAction<IUserPublic[]>) => {
      state.friends = action.payload;
    },
    setPendingRequests: (state, action: PayloadAction<IUserPublic[]>) => {
      state.pendingRequests = action.payload;
    },
  },
});

export const { setFriends, setPendingRequests } = contactSlice.actions;
export default contactSlice.reducer;
