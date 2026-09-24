import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchFlags } from '@/api/flagsApi'

export function useFlags(connectionId: number, label: string | null) {
  return useQuery({
    queryKey: ['flags', connectionId, label],
    queryFn: () => fetchFlags(connectionId, label),
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    enabled: !!connectionId,
    refetchInterval: (query) => {
      const hasDeploying = query.state.data?.some(f => f.deployStatus === 'deploying')
      return hasDeploying ? 3000 : false
    },
  })
}
