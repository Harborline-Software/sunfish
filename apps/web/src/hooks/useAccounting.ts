import { useQuery } from '@tanstack/react-query'
import { getAccountingSummary, getAccountingOutstanding } from '@/api/financial'
import { useCompanyStore } from '@/stores/companyStore'

/** W#76 PR 2 (RB-7) — AR summary via /api/v1/financial/accounting/summary */
export function useAccountingSummary() {
  const activeCompany = useCompanyStore((s) => s.activeCompany)
  return useQuery({
    queryKey: ['accounting', 'summary', activeCompany],
    queryFn: getAccountingSummary,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  })
}

/** W#76 PR 2 (RB-7) — outstanding invoice rows via /api/v1/financial/accounting/outstanding */
export function useAccountingOutstanding() {
  const activeCompany = useCompanyStore((s) => s.activeCompany)
  return useQuery({
    queryKey: ['accounting', 'outstanding', activeCompany],
    queryFn: getAccountingOutstanding,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  })
}
