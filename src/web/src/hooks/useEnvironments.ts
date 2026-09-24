import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addEnvironment, reorderEnvironments, updateEnvironment, deleteEnvironment } from '@/api/environmentsApi'
import type { CreateEnvironmentRequest, ReorderEnvironmentsRequest } from '@/types/connection'

export function useAddEnvironment(connectionId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (req: CreateEnvironmentRequest) => addEnvironment(connectionId, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      queryClient.invalidateQueries({ queryKey: ['connections', connectionId] })
    },
  })
}

export function useReorderEnvironments(connectionId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (req: ReorderEnvironmentsRequest) => reorderEnvironments(connectionId, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections', connectionId] })
    },
  })
}

export function useUpdateEnvironment(connectionId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ environmentId, ...req }: { environmentId: number; name?: string; environmentKey?: string }) =>
      updateEnvironment(connectionId, environmentId, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      queryClient.invalidateQueries({ queryKey: ['connections', connectionId] })
    },
  })
}

export function useDeleteEnvironment(connectionId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (environmentId: number) => deleteEnvironment(connectionId, environmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      queryClient.invalidateQueries({ queryKey: ['connections', connectionId] })
    },
  })
}
