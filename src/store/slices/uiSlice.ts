import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ThemeMode = 'light' | 'dark';

interface UiState {
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  isMobile: boolean;
}

const initialState: UiState = {
  theme: (localStorage.getItem('theme') as ThemeMode) || 'light',
  sidebarCollapsed: false,
  isMobile: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', state.theme);
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    setIsMobile: (state, action: PayloadAction<boolean>) => {
      state.isMobile = action.payload;
    },
  },
});

export const { toggleTheme, setSidebarCollapsed, setIsMobile } = uiSlice.actions;
export default uiSlice.reducer;
