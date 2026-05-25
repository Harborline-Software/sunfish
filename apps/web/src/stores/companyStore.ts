import { create } from 'zustand'

interface CompanyState {
  activeCompany: string
  availableCompanies: string[]
  // Cohort-4 cycle 2 — substrate opaque tenant identifier from /api/v1/whoami.
  // Empty string ("") when no tenant is bound (dev-stub / pre-bind state).
  // Used for defense-in-depth A1 assertion in AuditEventDetailPage:
  //   compare detail.tenant_id !== activeTenantId (substrate-substrate).
  // NOT the ERPNext display name; do not compare against activeCompany.
  activeTenantId: string
  setActiveCompany: (company: string) => void
  setAvailableCompanies: (companies: string[]) => void
  setActiveTenantId: (tenantId: string) => void
}

export const useCompanyStore = create<CompanyState>()((set) => ({
  activeCompany: '',
  availableCompanies: [],
  activeTenantId: '',
  setActiveCompany: (company) => set({ activeCompany: company }),
  setAvailableCompanies: (companies) => set({ availableCompanies: companies }),
  setActiveTenantId: (tenantId) => set({ activeTenantId: tenantId }),
}))
