import type { TranslationKeys } from './en-US'

const de: Partial<TranslationKeys> = {
  nav: {
    appName: 'Sunfish',
    properties: 'Immobilien',
    leases: 'Mietverträge',
    rent: 'Miete',
    accounting: 'Buchhaltung',
    comms: 'Kommunikation',
    maintenance: 'Wartung',
    reports: 'Berichte',
    cockpit: 'Cockpit',
  },
  common: {
    retry: 'Erneut versuchen',
    loading: 'Wird geladen…',
    noData: 'Keine Daten gefunden',
    error: 'Etwas ist schiefgelaufen',
    detail: 'Details →',
    back: '← Zurück',
    save: 'Speichern',
    cancel: 'Abbrechen',
    submit: 'Absenden',
    clear: 'Löschen',
    units: '{{count}} Einheit',
    units_other: '{{count}} Einheiten',
    pages: {
      previous: 'Zurück',
      next: 'Weiter',
    },
  },
  locale: {
    label: 'Sprache',
    options: {
      'en-US': 'English',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
    },
  },
}

export default de
