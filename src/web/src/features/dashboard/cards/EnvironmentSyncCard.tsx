import { Link } from 'react-router'
import { FolderOpen, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { compareWithBaseline, flagPath } from '../dashboardData'
import type { Connection } from '@/types/connection'
import type { FeatureFlag } from '@/types/flag'

export function EnvironmentSyncCard({
  connection,
  envFlagsMap,
  isLoading,
}: {
  connection: Connection
  envFlagsMap: Map<string, FeatureFlag[]>
  isLoading: boolean
}) {
  const { baseline, driftedFlags } = compareWithBaseline(connection, envFlagsMap)
  const comparable = connection.environments.length > 1
  // A handful is enough to act on; the badge opens the full, filtered list.
  const shown = driftedFlags.slice(0, 5)

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg p-1.5 bg-violet-subtle">
              <FolderOpen className="h-3.5 w-3.5 text-violet" />
            </div>
            <CardTitle className="text-base">{connection.name}</CardTitle>
            {driftedFlags.length > 0 && (
              <Link to={`/connections/${connection.id}/flags?status=drift`}>
                <Badge className="bg-amber-subtle text-amber border-0 text-xs font-medium hover:bg-amber-subtle/70">
                  {driftedFlags.length} drifted
                </Badge>
              </Link>
            )}
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/connections/${connection.id}/flags`}>
              Open
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>
        <CardDescription>
          {connection.environments.length} environment{connection.environments.length !== 1 ? 's' : ''}
          {comparable && <> &middot; compared with {baseline.name}</>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !comparable ? (
          <p className="text-sm text-muted-foreground">
            Add at least 2 environments to compare.
          </p>
        ) : driftedFlags.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald" />
            Every flag matches {baseline.name}.
          </p>
        ) : (
          <div className="space-y-1">
            {shown.map(({ flagId, displayName, envNames }) => (
              <Link
                key={flagId}
                to={flagPath(connection.id, flagId)}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{displayName || flagId}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    differs in {envNames.join(', ')}
                  </p>
                </div>
                <Badge className="shrink-0 ml-3 bg-amber-subtle text-amber border-0 text-xs font-medium">
                  {envNames.length} of {connection.environments.length - 1}
                </Badge>
              </Link>
            ))}
            {driftedFlags.length > shown.length && (
              <Link
                to={`/connections/${connection.id}/flags?status=drift`}
                className="block px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {driftedFlags.length - shown.length} more
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
