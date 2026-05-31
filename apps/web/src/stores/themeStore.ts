import { create } from 'zustand'
import { type ThemePreference, getStoredTheme, storeTheme, resolveTheme, applyTheme } from '@/lib/theme'

interface ThemeState {
  preference: ThemePreference
  resolved: 'light' | 'dark'
  setPreference: (pref: ThemePreference) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: getStoredTheme(),
  resolved: resolveTheme(getStoredTheme()),
  setPreference(pref) {
    const resolved = resolveTheme(pref)
    storeTheme(pref)
    applyTheme(resolved)
    set({ preference: pref, resolved })
  },
}))
