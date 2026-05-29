import { useMutation, useQuery } from '@tanstack/react-query'
import {
  runTrialBalance,
  runArAgingSummary,
  runApAgingSummary,
  runProfitAndLossByProperty,
  runRentRoll,
  getCharts,
  type TrialBalanceParameters,
  type ArAgingSummaryParameters,
  type ApAgingSummaryParameters,
  type ProfitAndLossByPropertyParameters,
  type RentRollParameters,
} from '@/api/reports'

export function useTrialBalance() {
  return useMutation({
    mutationFn: (params: TrialBalanceParameters) => runTrialBalance(params),
  })
}

export function useArAgingSummary() {
  return useMutation({
    mutationFn: (params: ArAgingSummaryParameters) => runArAgingSummary(params),
  })
}

export function useApAgingSummary() {
  return useMutation({
    mutationFn: (params: ApAgingSummaryParameters) => runApAgingSummary(params),
  })
}

export function useProfitAndLossByProperty() {
  return useMutation({
    mutationFn: (params: ProfitAndLossByPropertyParameters) => runProfitAndLossByProperty(params),
  })
}

export function useRentRoll() {
  return useMutation({
    mutationFn: (params: RentRollParameters) => runRentRoll(params),
  })
}

export function useCharts() {
  return useQuery({
    queryKey: ['reports', 'charts'],
    queryFn: getCharts,
    staleTime: 5 * 60_000,
  })
}
