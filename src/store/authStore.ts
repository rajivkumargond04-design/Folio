import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  token: string | null;
  sessionExpiry: number | null;
  login: (username: string, token: string) => void;
  logout: () => void;
  checkSession: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      username: null,
      token: null,
      sessionExpiry: null,

      login: (username, token) => {
        const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
        set({ isAuthenticated: true, username, token, sessionExpiry: expiry });
      },

      logout: () => {
        set({ isAuthenticated: false, username: null, token: null, sessionExpiry: null });
      },

      checkSession: () => {
        const { sessionExpiry, isAuthenticated } = get();
        if (!isAuthenticated || !sessionExpiry) return false;
        if (Date.now() > sessionExpiry) {
          get().logout();
          return false;
        }
        return true;
      },
    }),
    {
      name: 'folio-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        username: state.username,
        token: state.token,
        sessionExpiry: state.sessionExpiry,
      }),
    }
  )
);
