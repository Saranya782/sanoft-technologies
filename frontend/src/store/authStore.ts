import { create } from 'zustand';
import type { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  dbUser: any | null; // The user object from our Firestore database
  token: string | null;
  isLoading: boolean;
  setUser: (user: User | null, token?: string | null) => void;
  setDbUser: (dbUser: any | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  dbUser: null,
  token: null,
  isLoading: true,
  setUser: (user, token = null) => set({ user, token }),
  setDbUser: (dbUser) => set({ dbUser }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, dbUser: null, token: null, isLoading: false }),
}));
