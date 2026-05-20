import { create } from 'zustand'
import { i18next, type SupportedLocale, LOCALE_KEY, SUPPORTED_LOCALES } from '@/i18n'

interface LocaleState {
  locale: SupportedLocale
  setLocale: (locale: SupportedLocale) => void
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: i18next.language as SupportedLocale,
  setLocale(locale) {
    void i18next.changeLanguage(locale)
    try {
      localStorage.setItem(LOCALE_KEY, locale)
    } catch {
      // localStorage unavailable
    }
    set({ locale })
  },
}))

export { SUPPORTED_LOCALES }
