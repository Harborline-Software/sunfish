import type { TranslationKeys } from './en-US'

const fr: Partial<TranslationKeys> = {
  nav: {
    appName: 'Sunfish',
    properties: 'Propriétés',
    leases: 'Baux',
    rent: 'Loyers',
    accounting: 'Comptabilité',
    comms: 'Communications',
    maintenance: 'Maintenance',
    reports: 'Rapports',
    cockpit: 'Tableau de bord',
  },
  common: {
    retry: 'Réessayer',
    loading: 'Chargement…',
    noData: 'Aucune donnée trouvée',
    error: 'Une erreur est survenue',
    detail: 'Détail →',
    back: '← Retour',
    save: 'Enregistrer',
    cancel: 'Annuler',
    submit: 'Envoyer',
    clear: 'Effacer',
    units: '{{count}} unité',
    units_other: '{{count}} unités',
    pages: {
      previous: 'Précédent',
      next: 'Suivant',
    },
  },
  locale: {
    label: 'Langue',
    options: {
      'en-US': 'English',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
    },
  },
}

export default fr
