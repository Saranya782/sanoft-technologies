import { create } from 'zustand';

interface UiState {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unreadAlertsCount: number;
  setUnreadAlertsCount: (count: number) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'overview',
  setActiveTab: (tab) => set({ activeTab: tab }),
  unreadAlertsCount: 0,
  setUnreadAlertsCount: (count) => set({ unreadAlertsCount: count }),
  theme: 'light',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
}));
