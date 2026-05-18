import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createWorkOrder, getCsrfToken, getWorkOrders } from '@/api/maintenance'
import type { CreateWorkOrderInput } from '@/api/maintenance'
import { useCompanyStore } from '@/stores/companyStore'

export function useWorkOrders(params?: Parameters<typeof getWorkOrders>[0]) {
  const activeCompany = useCompanyStore((s) => s.activeCompany)
  return useQuery({
    queryKey: ['maintenance', 'work-orders', activeCompany, params],
    queryFn: () => getWorkOrders(params),
    staleTime: 2 * 60 * 1_000,
  })
}

export function useCreateWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateWorkOrderInput) => {
      const token = await getCsrfToken()
      return createWorkOrder(input, token)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['maintenance'] }),
  })
}
