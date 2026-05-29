import { create } from 'zustand'

interface AuthState {
  user: string
  role: string
  loaded: boolean
  isAuthenticated: boolean
  csrfToken: string | null
  setAuth: (user: string, role: string) => void
  setUnauthenticated: () => void
  setCsrfToken: (token: string | null) => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: '',
  role: '',
  loaded: false,
  isAuthenticated: false,
  csrfToken: null,
  setAuth: (user, role) => set({ user, role, loaded: true, isAuthenticated: true }),
  setUnauthenticated: () => set({ loaded: true, isAuthenticated: false }),
  setCsrfToken: (token) => set({ csrfToken: token }),
}))
