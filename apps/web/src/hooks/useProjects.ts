/**
 * TanStack Query hooks for the /api/v1/projects endpoint family.
 * PM pilot — Stage-06 build.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProjects,
  getProject,
  getProjectTimeline,
  getProjectMilestones,
  getProjectBudget,
  getProjectTimeEntries,
  createProject,
  transitionProject,
  addMilestone,
  achieveMilestone,
  insertBudgetRevision,
  timeLifecycle,
  approveTimeEntry,
  rejectTimeEntry,
} from '@/api/projects'
import type {
  CreateProjectInput,
  TransitionProjectInput,
  AddMilestoneInput,
  AchieveMilestoneInput,
  BudgetRevisionInput,
  TimeLifecycleInput,
  TimeApprovalInput,
} from '@/api/projects'

// ── Read hooks ────────────────────────────────────────────────────────────────

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
    staleTime: 30_000,
    retry: 1,
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id),
    enabled: id.length > 0,
    staleTime: 30_000,
    retry: 1,
  })
}

export function useProjectTimeline(id: string) {
  return useQuery({
    queryKey: ['project-timeline', id],
    queryFn: () => getProjectTimeline(id),
    enabled: id.length > 0,
    staleTime: 60_000,
    retry: 1,
  })
}

export function useProjectMilestones(id: string) {
  return useQuery({
    queryKey: ['project-milestones', id],
    queryFn: () => getProjectMilestones(id),
    enabled: id.length > 0,
    staleTime: 30_000,
    retry: 1,
  })
}

export function useProjectBudget(id: string) {
  return useQuery({
    queryKey: ['project-budget', id],
    queryFn: () => getProjectBudget(id),
    enabled: id.length > 0,
    staleTime: 30_000,
    retry: 1,
  })
}

export function useProjectTimeEntries(id: string) {
  return useQuery({
    queryKey: ['project-time', id],
    queryFn: () => getProjectTimeEntries(id),
    enabled: id.length > 0,
    staleTime: 15_000,
    retry: 1,
  })
}

// ── Write mutations ───────────────────────────────────────────────────────────

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useTransitionProject(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TransitionProjectInput) => transitionProject(projectId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId] })
      void qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useAddMilestone(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AddMilestoneInput) => addMilestone(projectId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project-milestones', projectId] })
      void qc.invalidateQueries({ queryKey: ['project-timeline', projectId] })
    },
  })
}

export function useAchieveMilestone(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ milestoneId, input }: { milestoneId: string; input: AchieveMilestoneInput }) =>
      achieveMilestone(projectId, milestoneId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project-milestones', projectId] })
      void qc.invalidateQueries({ queryKey: ['project-timeline', projectId] })
    },
  })
}

export function useInsertBudgetRevision(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BudgetRevisionInput) => insertBudgetRevision(projectId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project-budget', projectId] })
    },
  })
}

export function useTimeLifecycle(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TimeLifecycleInput) => timeLifecycle(projectId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project-time', projectId] })
    },
  })
}

export function useApproveTimeEntry(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ timeEntryId, input }: { timeEntryId: string; input: TimeApprovalInput }) =>
      approveTimeEntry(projectId, timeEntryId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project-time', projectId] })
    },
  })
}

export function useRejectTimeEntry(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ timeEntryId, input }: { timeEntryId: string; input: TimeApprovalInput }) =>
      rejectTimeEntry(projectId, timeEntryId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project-time', projectId] })
    },
  })
}
