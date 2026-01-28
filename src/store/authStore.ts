import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../types';
import { authService } from '../services/api';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
  
  isGerente: () => boolean;
  isCajero: () => boolean;
  isDealer: () => boolean;
  canAccess: (roles: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const tokenResponse = await authService.login({ username, password });
          console.log('Login response:', tokenResponse);
          
          const user = await authService.getCurrentUser();
          console.log('User data:', user);
          
          set({ user, isAuthenticated: true, isLoading: false });
          return true;
        } catch (error: any) {
          console.error('Login error:', error);
          const message = error.response?.data?.detail || 'Error al iniciar sesión';
          set({ error: message, isLoading: false, isAuthenticated: false, user: null });
          return false;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authService.logout();
        } finally {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      loadUser: async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
          set({ isAuthenticated: false, user: null, isLoading: false });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await authService.getCurrentUser();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          console.error('Load user error:', error);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      clearError: () => set({ error: null }),

      isGerente: () => get().user?.tipo === 'GERENTE',
      isCajero: () => {
        const tipo = get().user?.tipo;
        return tipo === 'CAJERO' || tipo === 'GERENTE';
      },
      isDealer: () => get().user?.tipo === 'DEALER',
      canAccess: (roles: string[]) => {
        const tipo = get().user?.tipo;
        return tipo ? roles.includes(tipo) : false;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
