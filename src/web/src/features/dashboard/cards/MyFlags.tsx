import { Link } from 'react-router'
import { UserCheck } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { flagPath, type EnvFlags } from '../dashboardData'
import type { Connection } from '@/types/connection'
import type { FeatureFlag } from '@/types/flag'

export function MyFlags({
  allEnvFlags,
  userId,
  now,
  isLoading,
}: {
  allEnvFlags: EnvFlags[]
  userId: string
  now: number
  isLoading: boolean
}) {
  interface OwnedFlag {
    flag: FeatureFlag
    connection: Connection
    envCount: number
    enabledCount: number
    expiresAt: string | null
  }

  const byKey = new Map<string, OwnedFlag>()
  for (const { connection, flags } of allEnvFlags) {
    for (const flag of flags) {
      if (flag.ownerId !== userId) continue
      const key = `${connection.id}-${flag.id}`
      const existing = byKey.get(key)
      if (existing) {
        existing.envCount++
        if (flag.isEnabled) existing.enabledCount++
        if (flag.expiresAt && (!existing.expiresAt || flag.expiresAt < existing.expiresAt)) {
          existing.expiresAt = flag.expiresAt
        }
      } else {
        byKey.set(key, {
          flag,
          connection,
          envCount: 1,
          enabledCount: flag.isEnabled ? 1 : 0,
          expiresAt: flag.expiresAt,
        })
      }
    }
  }

  const myFlags = Array.from(byKey.values()).sort((a, b) => {
    if (a.expiresAt && b.expiresAt) return a.expiresAt.localeCompare(b.expiresAt)
    if (a.expiresAt) return -1
    if (b.expiresAt) return 1
    return a.flag.id.localeCompare(b.flag.id)
  })

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg p-1.5 bg-emerald-subtle">
            <UserCheck className="h-3.5 w-3.5 text-emerald" />
          </div>
          <CardTitle className="text-base">My Flags</CardTitle>
        </div>
        <CardDescription>Flags you own, closest retirement first</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : myFlags.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            You don't own any flags yet. Assign yourself from the Owner column in a flag table.
          </p>
        ) : (
          <div className="space-y-1">
            {myFlags.map(({ flag, connection, envCount, enabledCount, expiresAt }) => {
              const overdue = expiresAt !== null && new Date(expiresAt).getTime() < now
              return (
                <Link
                  key={`${connection.id}-${flag.id}`}
                  to={flagPath(connection.id, flag.id)}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {flag.displayName || flag.id}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {connection.name} &middot; on in {enabledCount}/{envCount} env
                      {envCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {flag.isPermanent ? (
                      <span className="text-xs text-muted-foreground">Permanent</span>
                    ) : expiresAt ? (
                      <Badge
                        className={`text-xs border-0 font-medium ${
                          overdue ? 'bg-rose-subtle text-rose' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {overdue ? 'Retirement overdue' : `Retire by ${new Date(expiresAt).toLocaleDateString()}`}
                      </Badge>
                    ) : null}
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
