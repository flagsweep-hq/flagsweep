import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchFlagMatrix } from '@/api/flagsApi'

/**
 * Every flag in a connection with its per-environment copies, in one request.
 * The environment-scoped lists stay under ['flags', connectionId, label]; this
 * sits under the same root so a write to any environment invalidates both.
 */
export function useFlagMatrix(connectionId: number) {
  return useQuery({
    queryKey: ['flags', connectionId, 'matrix'],
    queryFn: () => fetchFlagMatrix(connectionId),
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    enabled: !!connectionId,
  })
}
