import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Post {
  postId: string;
  authorId: string;
  content: string;
  mediaUrls: string[];
  reactionsCount: Record<string, number>;
  commentsCount: number;
  createdAt: string;
}

interface NewsfeedState {
  posts: Post[];
  isLoading: boolean;
}

const initialState: NewsfeedState = {
  posts: [],
  isLoading: false,
};

const newsfeedSlice = createSlice({
  name: 'newsfeed',
  initialState,
  reducers: {
    setPosts: (state, action: PayloadAction<Post[]>) => {
      state.posts = action.payload;
    },
    addPost: (state, action: PayloadAction<Post>) => {
      state.posts.unshift(action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setPosts, addPost, setLoading } = newsfeedSlice.actions;
export default newsfeedSlice.reducer;
