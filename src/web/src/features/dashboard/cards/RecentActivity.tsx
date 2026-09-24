import { Link } from 'react-router'
import { Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { flagPath, type EnvFlags } from '../dashboardData'
import type { FeatureFlag } from '@/types/flag'

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function RecentActivity({
  allEnvFlags,
  isLoading,
}: {
  allEnvFlags: EnvFlags[]
  isLoading: boolean
}) {
  // Newest copy of each flag, so a flag touched in three environments shows once.
  const newest = new Map<string, EnvFlags & { flag: FeatureFlag; lastModified: string }>()
  for (const entry of allEnvFlags) {
    for (const flag of entry.flags) {
      if (!flag.lastModified) continue
      const key = `${entry.connection.id}-${flag.id}`
      const existing = newest.get(key)
      if (!existing || flag.lastModified > existing.lastModified) {
        newest.set(key, { ...entry, flag, lastModified: flag.lastModified })
      }
    }
  }
  const recentFlags = Array.from(newest.values())
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified))
    .slice(0, 10)

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg p-1.5 bg-sky-subtle">
            <Clock className="h-3.5 w-3.5 text-sky" />
          </div>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </div>
        <CardDescription>Latest flag changes across all connections</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : recentFlags.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No recent flag activity yet.
          </p>
        ) : (
          <div className="space-y-1">
            {recentFlags.map(({ flag, connection, env, lastModified }) => {
              return (
                <Link
                  key={`${connection.id}-${flag.id}-${env.id}`}
                  to={flagPath(connection.id, flag.id)}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-2.5 w-2.5 rounded-full shrink-0 ring-2 ${
                        flag.isEnabled
                          ? 'bg-emerald ring-emerald/20'
                          : 'bg-muted-foreground/30 ring-muted-foreground/10'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {flag.displayName || flag.id}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {connection.name} &middot; {env.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Badge
                      className={`text-xs border-0 font-medium ${
                        flag.isEnabled
                          ? 'bg-emerald-subtle text-emerald'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {flag.isEnabled ? 'On' : 'Off'}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                      {formatRelativeTime(lastModified)}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
