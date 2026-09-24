import { Link, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { BreadcrumbHeader } from '@/components/shared/BreadcrumbHeader'
import { FlagDetail } from '@/features/flags/FlagDetail'
import { useConnection } from '@/hooks/useConnections'
import { useFlagMatrix } from '@/hooks/useFlagMatrix'
import { PageSkeleton } from '@/components/shared/PageSkeleton'

export function FlagDetailPage() {
  const { connectionId, flagId } = useParams<{ connectionId: string; flagId: string }>()
  const numericConnectionId = Number(connectionId)
  const decodedFlagId = decodeURIComponent(flagId ?? '')

  const { data: connection, isLoading: connectionLoading } = useConnection(numericConnectionId)
  const { data: rows = [], isLoading: rowsLoading } = useFlagMatrix(numericConnectionId)

  if (connectionLoading || rowsLoading || !connection) {
    return <PageSkeleton />
  }

  const row = rows.find((r) => r.flagId === decodedFlagId) ?? null
  const environments = [...connection.environments].sort((a, b) => a.sortOrder - b.sortOrder)
  const flagsPath = `/connections/${numericConnectionId}/flags`

  return (
    <>
      <BreadcrumbHeader
        connectionName={connection.name}
        connectionId={connection.id}
        pageName={row ? row.displayName ?? row.flagId : 'Flag'}
      />
      <div className="p-6 page-enter space-y-4">
        <Link
          to={flagsPath}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All flags
        </Link>

        {row === null ? (
          <div className="py-16 text-center">
            <p className="text-lg text-muted-foreground">Flag not found.</p>
            <p className="text-sm text-muted-foreground mt-2">
              <span className="font-mono">{decodedFlagId}</span> does not exist in any environment
              of this connection. It may have been deleted.
            </p>
          </div>
        ) : (
          <FlagDetail
            connectionId={numericConnectionId}
            row={row}
            environments={environments}
          />
        )}
      </div>
    </>
  )
}
