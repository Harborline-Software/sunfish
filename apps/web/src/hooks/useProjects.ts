import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getProjects,
  getProject,
  getProjectMilestones,
  getProjectTimeline,
  getProjectBudget,
  getProjectTimeEntries,
  createProject,
  transitionProject,
  addMilestone,
  achieveMilestone,
  insertBudgetRevision,
  openTimeEntry,
  stopTimeEntry,
  submitTimeEntry,
  approveTimeEntry,
  rejectTimeEntry,
} from '@/api/projects'
import type {
  CreateProjectInput,
  TransitionProjectInput,
  AddMilestoneInput,
  AchieveMilestoneInput,
  InsertBudgetRevisionInput,
  StopTimeInput,
} from '@/api/projects'

const PROJECTS_KEY = ['projects'] as const

export function useProjects() {
  return useQuery({
    queryKey: PROJECTS_KEY,
    queryFn: getProjects,
    staleTime: 2 * 60_000,
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, id],
    queryFn: () => getProject(id),
    staleTime: 2 * 60_000,
    enabled: Boolean(id),
  })
}

export function useProjectMilestones(id: string) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, id, 'milestones'],
    queryFn: () => getProjectMilestones(id),
    staleTime: 2 * 60_000,
    enabled: Boolean(id),
  })
}

export function useProjectTimeline(id: string) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, id, 'timeline'],
    queryFn: () => getProjectTimeline(id),
    staleTime: 2 * 60_000,
    enabled: Boolean(id),
  })
}

export function useProjectBudget(id: string) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, id, 'budget'],
    queryFn: () => getProjectBudget(id),
    staleTime: 2 * 60_000,
    enabled: Boolean(id),
  })
}

export function useProjectTimeEntries(id: string) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, id, 'time'],
    queryFn: () => getProjectTimeEntries(id),
    staleTime: 30_000,
    enabled: Boolean(id),
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: PROJECTS_KEY }),
  })
}

export function useTransitionProject(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TransitionProjectInput) => transitionProject(id, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: PROJECTS_KEY }),
  })
}

export function useAddMilestone(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AddMilestoneInput) => addMilestone(projectId, input),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: [...PROJECTS_KEY, projectId, 'milestones'] }),
  })
}

export function useAchieveMilestone(projectId: string, milestoneId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input?: AchieveMilestoneInput) => achieveMilestone(projectId, milestoneId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...PROJECTS_KEY, projectId, 'milestones'] })
      void qc.invalidateQueries({ queryKey: [...PROJECTS_KEY, projectId, 'timeline'] })
    },
  })
}

export function useInsertBudgetRevision(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: InsertBudgetRevisionInput) => insertBudgetRevision(projectId, input),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: [...PROJECTS_KEY, projectId, 'budget'] }),
  })
}

export function useOpenTimeEntry(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => openTimeEntry(projectId),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: [...PROJECTS_KEY, projectId, 'time'] }),
  })
}

export function useStopTimeEntry(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entryId, input }: { entryId: string; input: StopTimeInput }) =>
      stopTimeEntry(entryId, input),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: [...PROJECTS_KEY, projectId, 'time'] }),
  })
}

export function useSubmitTimeEntry(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entryId: string) => submitTimeEntry(entryId),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: [...PROJECTS_KEY, projectId, 'time'] }),
  })
}

export function useApproveTimeEntry(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entryId: string) => approveTimeEntry(entryId),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: [...PROJECTS_KEY, projectId, 'time'] }),
  })
}

export function useRejectTimeEntry(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entryId: string) => rejectTimeEntry(entryId),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: [...PROJECTS_KEY, projectId, 'time'] }),
  })
}
