import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchAuditEntries } from '@/api/auditApi'

const PAGE_SIZE = 50

export function useAuditEntries(connectionId: number, params?: { environmentId?: number }) {
  return useInfiniteQuery({
    queryKey: ['audit', connectionId, params?.environmentId ?? null],
    queryFn: ({ pageParam }) =>
      fetchAuditEntries(connectionId, {
        environmentId: params?.environmentId,
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasMore ? last.offset + last.items.length : undefined),
    staleTime: 10_000,
    enabled: !!connectionId,
  })
}
