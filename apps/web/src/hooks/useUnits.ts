import { useQuery } from '@tanstack/react-query'
import { getUnits, getUnit, getVacancies } from '@/api/units'
import { useCompanyStore } from '@/stores/companyStore'

export function useUnits(propertyId: string) {
  const activeCompany = useCompanyStore((s) => s.activeCompany)
  return useQuery({
    queryKey: ['units', activeCompany, propertyId],
    queryFn: () => getUnits(propertyId),
    enabled: !!propertyId,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  })
}

export function useUnit(unitId: string) {
  const activeCompany = useCompanyStore((s) => s.activeCompany)
  return useQuery({
    queryKey: ['unit', activeCompany, unitId],
    queryFn: () => getUnit(unitId),
    enabled: !!unitId,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  })
}

export function useVacancies() {
  const activeCompany = useCompanyStore((s) => s.activeCompany)
  return useQuery({
    queryKey: ['vacancies', activeCompany],
    queryFn: getVacancies,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  })
}
