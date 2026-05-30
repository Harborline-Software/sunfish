import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import enUS from './locales/en-US'
import es from './locales/es'
import fr from './locales/fr'
import de from './locales/de'

export const SUPPORTED_LOCALES = ['en-US', 'es', 'fr', 'de'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const LOCALE_KEY = 'sunfish:locale'

export function getStoredLocale(): SupportedLocale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY)
    if (SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
      return stored as SupportedLocale
    }
  } catch {
    // localStorage unavailable
  }
  return 'en-US'
}

i18next.use(initReactI18next).init({
  resources: {
    'en-US': { translation: enUS },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
  },
  lng: getStoredLocale(),
  fallbackLng: 'en-US',
  interpolation: {
    escapeValue: false,
  },
})

export { i18next }
