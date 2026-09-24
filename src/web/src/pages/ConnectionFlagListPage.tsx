import { useParams, useSearchParams } from 'react-router'
import { BreadcrumbHeader } from '@/components/shared/BreadcrumbHeader'
import { FlagList } from '@/features/flags/FlagList'
import { useConnection } from '@/hooks/useConnections'
import { useFlagMatrix } from '@/hooks/useFlagMatrix'
import { PageSkeleton } from '@/components/shared/PageSkeleton'

/** The connection's primary, flag-first view. */
export function ConnectionFlagListPage() {
  const { connectionId } = useParams<{ connectionId: string }>()
  const numericConnectionId = Number(connectionId)
  // The dashboard links in with ?status=out-of-sync / overdue so a count there
  // lands on exactly the flags behind it.
  const [searchParams] = useSearchParams()
  const initialStatus = searchParams.get('status')

  const { data: connection, isLoading: connectionLoading } = useConnection(numericConnectionId)
  const { data: rows = [], isLoading: rowsLoading } = useFlagMatrix(numericConnectionId)

  if (connectionLoading || !connection) {
    return <PageSkeleton />
  }

  const environments = [...connection.environments].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <>
      <BreadcrumbHeader
        connectionName={connection.name}
        connectionId={connection.id}
        pageName="Flags"
      />
      <div className="p-6 page-enter">
        <FlagList
          connectionId={numericConnectionId}
          rows={rows}
          environments={environments}
          isLoading={rowsLoading}
          initialStatus={initialStatus}
        />
      </div>
    </>
  )
}
