import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { FolderOpen } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { useConnections } from '@/hooks/useConnections'
import { useAuth } from '@/contexts/AuthContext'
import { fetchFlags } from '@/api/flagsApi'
import { compareWithBaseline, type EnvFlags } from './dashboardData'
import { StatsCards } from './cards/StatsCards'
import { EnvironmentSyncCard } from './cards/EnvironmentSyncCard'
import { NeedsRetirement } from './cards/NeedsRetirement'
import { MyFlags } from './cards/MyFlags'
import { RecentActivity } from './cards/RecentActivity'

export function Dashboard() {
  const { user, isAdmin } = useAuth()
  const { data: connections = [], isLoading } = useConnections()

  // Read once per mount so the cards agree with each other on what "overdue" means.
  const [now] = useState(() => Date.now())

  const envQueryInputs = connections.flatMap((connection) =>
    connection.environments.map((env) => ({ connection, env })),
  )

  const flagQueries = useQueries({
    queries: envQueryInputs.map(({ connection, env }) => ({
      queryKey: ['flags', connection.id, env.environmentKey],
      queryFn: () => fetchFlags(connection.id, env.environmentKey),
      staleTime: 60_000,
    })),
  })

  const isFlagsLoading = flagQueries.some((q) => q.isLoading)

  const allEnvFlags: EnvFlags[] = envQueryInputs.flatMap(({ connection, env }, i) => {
    const flags = flagQueries[i].data
    return flags ? [{ connection, env, flags }] : []
  })
  const envFlagsMap = new Map(
    allEnvFlags.map(({ connection, env, flags }) => [`${connection.id}-${env.environmentKey}`, flags]),
  )

  const totalUniqueFlags = new Set(
    allEnvFlags.flatMap(({ connection, flags }) => flags.map((f) => `${connection.id}-${f.id}`)),
  ).size

  const totalDrifted = connections.reduce(
    (sum, connection) => sum + compareWithBaseline(connection, envFlagsMap).driftedFlags.length,
    0,
  )

  if (!isLoading && connections.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Welcome to Flagsweep"
        description={
          isAdmin
            ? 'Create a connection by connecting your Azure App Configuration store.'
            : 'There are no connections yet. Ask an admin to connect a flag store.'
        }
        action={isAdmin ? { label: 'Create connection', href: '/new-connection' } : undefined}
      />
    )
  }

  return (
    <div className="space-y-6">
      <StatsCards
        connections={connections}
        totalFlags={totalUniqueFlags}
        totalDrifted={totalDrifted}
        isLoading={isLoading || isFlagsLoading}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {isLoading ? (
            <>
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </>
          ) : (
            connections.map((connection) => (
              <EnvironmentSyncCard
                key={connection.id}
                connection={connection}
                envFlagsMap={envFlagsMap}
                isLoading={isFlagsLoading}
              />
            ))
          )}

          <NeedsRetirement allEnvFlags={allEnvFlags} now={now} isLoading={isLoading || isFlagsLoading} />
        </div>

        <div className="space-y-6">
          {user && (
            <MyFlags
              allEnvFlags={allEnvFlags}
              userId={user.id}
              now={now}
              isLoading={isLoading || isFlagsLoading}
            />
          )}
          <RecentActivity allEnvFlags={allEnvFlags} isLoading={isLoading || isFlagsLoading} />
        </div>
      </div>
    </div>
  )
}
