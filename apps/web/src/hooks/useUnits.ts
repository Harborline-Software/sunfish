import { useQuery } from '@tanstack/react-query'
import { getVacancies, getUnitDetail, getPropertyUnits } from '@/api/units'
import { useCompanyStore } from '@/stores/companyStore'

// Cohort-5 TanStack Query hooks for the unit + vacancy surface.

export function useVacancies() {
  const activeCompany = useCompanyStore((s) => s.activeCompany)
  return useQuery({
    queryKey: ['vacancies', activeCompany],
    queryFn: getVacancies,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  })
}

export function useUnitDetail(unitId: string) {
  const activeCompany = useCompanyStore((s) => s.activeCompany)
  return useQuery({
    queryKey: ['unit', unitId, activeCompany],
    queryFn: () => getUnitDetail(unitId),
    enabled: Boolean(unitId),
    retry: (failureCount, error) => {
      // Do not retry 404s — the unit genuinely doesn't exist.
      if (error instanceof Error && error.name === 'UnitNotFoundError') return false
      return failureCount < 2
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  })
}

export function usePropertyUnits(propertyId: string) {
  const activeCompany = useCompanyStore((s) => s.activeCompany)
  return useQuery({
    queryKey: ['property-units', propertyId, activeCompany],
    queryFn: () => getPropertyUnits(propertyId),
    enabled: Boolean(propertyId),
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  })
}
