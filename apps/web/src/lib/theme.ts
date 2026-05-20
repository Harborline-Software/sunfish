export type ThemePreference = 'system' | 'light' | 'dark'

export const THEME_KEY = 'sunfish:theme'

export function getStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // localStorage unavailable
  }
  return 'system'
}

export function storeTheme(pref: ThemePreference): void {
  try {
    localStorage.setItem(THEME_KEY, pref)
  } catch {
    // localStorage unavailable
  }
}

export function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'light') return 'light'
  if (pref === 'dark') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(resolved: 'light' | 'dark'): void {
  const html = document.documentElement
  if (resolved === 'dark') {
    html.classList.add('dark')
  } else {
    html.classList.remove('dark')
  }
}

export function initTheme(): void {
  applyTheme(resolveTheme(getStoredTheme()))
}
