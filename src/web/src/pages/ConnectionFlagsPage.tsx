import { useParams } from 'react-router'
import { BreadcrumbHeader } from '@/components/shared/BreadcrumbHeader'
import { EnvironmentFlagTable } from '@/features/flags/EnvironmentFlagTable'
import { useConnection } from '@/hooks/useConnections'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Badge } from '@/components/ui/badge'
import { Shield } from 'lucide-react'

export function ConnectionFlagsPage() {
  const { connectionId, environmentId } = useParams<{
    connectionId: string
    environmentId: string
  }>()

  const numericConnectionId = Number(connectionId)
  const numericEnvId = Number(environmentId)

  const { data: connection, isLoading } = useConnection(numericConnectionId)

  if (isLoading || !connection) {
    return <PageSkeleton />
  }

  const environment = connection.environments.find((e) => e.id === numericEnvId)
  const environmentName = environment?.name ?? 'Unknown Environment'

  if (!environment) {
    return (
      <>
        <BreadcrumbHeader
          connectionName={connection.name}
          connectionId={connection.id}
          environmentName="Unknown"
        />
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <p className="text-muted-foreground text-lg">
            Environment not found.
          </p>
          <p className="text-muted-foreground text-sm mt-2">
            This environment may have been removed or doesn't exist.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <BreadcrumbHeader
        connectionName={connection.name}
        connectionId={connection.id}
        environmentName={environmentName}
        actions={
          environment.isProtected ? (
            <Badge className="gap-1 text-xs border-0 font-medium bg-amber-subtle text-amber">
              <Shield className="h-3 w-3" />
              Protected
            </Badge>
          ) : undefined
        }
      />
      <div className="p-6 page-enter">
        <EnvironmentFlagTable
          connectionId={numericConnectionId}
          environmentId={environment.id}
          environments={connection.environments}
          label={environment.environmentKey}
          isProtected={environment.isProtected}
        />
      </div>
    </>
  )
}
