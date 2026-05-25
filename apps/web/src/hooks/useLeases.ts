import { useQuery } from '@tanstack/react-query'
import { getLeases, getLease } from '@/api/leases'    // rebound from @/api/erpnext — W#74 PR 2
import { getLeasePayments } from '@/api/financial'    // W#76 PR 1 — RB-8
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

/** W#76 PR 1 (RB-8) — lease-scoped payment history via /api/v1/financial/payments?leaseId= */
export function useLeasePayments(leaseId: string) {
  return useQuery({
    queryKey: ['payments', 'lease', leaseId],
    queryFn: () => getLeasePayments(leaseId),
    enabled: Boolean(leaseId),
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  })
}
