import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchConnections,
  fetchConnection,
  createConnection,
  discoverStore,
  updateConnectionString,
  fetchConnectionStatus,
} from '@/api/connectionsApi'
import type {
  CreateConnectionRequest,
  DiscoverStoreRequest,
  UpdateConnectionStringRequest,
} from '@/types/connection'

export function useConnections() {
  return useQuery({
    queryKey: ['connections'],
    queryFn: fetchConnections,
    staleTime: 60_000,
  })
}

export function useConnection(connectionId: number) {
  return useQuery({
    queryKey: ['connections', connectionId],
    queryFn: () => fetchConnection(connectionId),
    enabled: !!connectionId,
  })
}

export function useCreateConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (req: CreateConnectionRequest) => createConnection(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })
}

export function useDiscoverStore() {
  return useMutation({
    mutationFn: (req: DiscoverStoreRequest) => discoverStore(req),
  })
}

export function useUpdateConnectionString(connectionId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (req: UpdateConnectionStringRequest) => updateConnectionString(connectionId, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      queryClient.invalidateQueries({ queryKey: ['connections', connectionId] })
    },
  })
}

export function useConnectionStatus(connectionId: number) {
  return useMutation({
    mutationFn: () => fetchConnectionStatus(connectionId),
  })
}
