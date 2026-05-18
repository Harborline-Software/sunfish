import { useQuery } from '@tanstack/react-query'
import { getLeases, getLease } from '@/api/leases'    // rebound from @/api/erpnext — W#74 PR 2
import { getPayments } from '@/api/erpnext'            // KEEP — payments deferred to Cohort 2 RB-8
import { useCompanyStore } from '@/stores/companyStore'

export function useLeases() {
  const activeCompany = useCompanyStore((s) => s.activeCompany)
  return useQuery({
    queryKey: ['leases', activeCompany],               // unchanged — preserves cache
    queryFn: () => getLeases('Active').then((r) => r.leases),  // unwrap to keep LeaseSummary[] consumer shape
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  })
}

export function useLease(name: string) {
  const activeCompany = useCompanyStore((s) => s.activeCompany)
  return useQuery({
    queryKey: ['lease', name, activeCompany],
    queryFn: () => getLease(name),
    enabled: Boolean(name),
  })
}

// Keep usePayments() calling /api/v1/erpnext/payments — Cohort 2 RB-8 rebinds it.
export function usePayments() {
  const activeCompany = useCompanyStore((s) => s.activeCompany)
  return useQuery({
    queryKey: ['payments', activeCompany],
    queryFn: getPayments,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  })
}
