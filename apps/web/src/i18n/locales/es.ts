import type { TranslationKeys } from './en-US'

const es: Partial<TranslationKeys> = {
  nav: {
    appName: 'Sunfish',
    properties: 'Propiedades',
    leases: 'Contratos',
    rent: 'Rentas',
    accounting: 'Contabilidad',
    comms: 'Comunicaciones',
    maintenance: 'Mantenimiento',
    reports: 'Reportes',
    cockpit: 'Panel',
  },
  common: {
    retry: 'Reintentar',
    loading: 'Cargando…',
    noData: 'No se encontraron datos',
    error: 'Algo salió mal',
    detail: 'Detalle →',
    back: '← Volver',
    save: 'Guardar',
    cancel: 'Cancelar',
    submit: 'Enviar',
    clear: 'Limpiar',
    units: '{{count}} unidad',
    units_other: '{{count}} unidades',
    pages: {
      previous: 'Anterior',
      next: 'Siguiente',
    },
  },
  locale: {
    label: 'Idioma',
    options: {
      'en-US': 'English',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
    },
  },
}

export default es
