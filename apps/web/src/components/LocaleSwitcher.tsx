import { useTranslation } from 'react-i18next'
import { useLocaleStore, SUPPORTED_LOCALES } from '@/stores/localeStore'
import type { SupportedLocale } from '@/i18n'

const LOCALE_LABELS: Record<SupportedLocale, string> = {
  'en-US': 'EN',
  'es': 'ES',
  'fr': 'FR',
  'de': 'DE',
}

export function LocaleSwitcher() {
  const { t } = useTranslation()
  const { locale, setLocale } = useLocaleStore()

  return (
    <div
      className="flex items-center rounded-md border border-border bg-muted p-0.5"
      role="radiogroup"
      aria-label={t('locale.label')}
    >
      {SUPPORTED_LOCALES.map((loc) => (
        <button
          key={loc}
          type="button"
          role="radio"
          aria-checked={locale === loc}
          aria-label={t(`locale.options.${loc}`)}
          onClick={() => setLocale(loc)}
          className={
            locale === loc
              ? 'rounded bg-background px-2 py-0.5 text-xs font-semibold text-foreground shadow-sm'
              : 'rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground'
          }
        >
          {LOCALE_LABELS[loc]}
        </button>
      ))}
    </div>
  )
}
