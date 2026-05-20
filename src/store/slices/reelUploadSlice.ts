import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type ReelUploadStatus = 'idle' | 'uploading' | 'done' | 'error';

interface ReelUploadState {
  status: ReelUploadStatus;
  progress: number;
  error: string | null;
}

const initialState: ReelUploadState = {
  status: 'idle',
  progress: 0,
  error: null,
};

const reelUploadSlice = createSlice({
  name: 'reelUpload',
  initialState,
  reducers: {
    uploadStarted(state) {
      state.status = 'uploading';
      state.progress = 0;
      state.error = null;
    },
    setProgress(state, action: PayloadAction<number>) {
      state.progress = action.payload;
    },
    uploadCompleted(state) {
      state.status = 'done';
      state.progress = 1;
    },
    uploadFailed(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error = action.payload;
    },
    resetUpload(state) {
      state.status = 'idle';
      state.progress = 0;
      state.error = null;
    },
  },
});

export const { uploadStarted, setProgress, uploadCompleted, uploadFailed, resetUpload } =
  reelUploadSlice.actions;
export const reelUploadReducer = reelUploadSlice.reducer;
