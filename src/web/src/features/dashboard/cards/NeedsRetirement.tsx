import { Link } from 'react-router'
import { CheckCircle2, Timer } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { RETIREMENT_WARNING_DAYS } from '@/features/flags/flagStatuses'
import { flagPath, type EnvFlags } from '../dashboardData'
import type { Connection } from '@/types/connection'
import type { FeatureFlag } from '@/types/flag'

export function NeedsRetirement({
  allEnvFlags,
  now,
  isLoading,
}: {
  allEnvFlags: EnvFlags[]
  now: number
  isLoading: boolean
}) {
  const soonest = new Map<string, { flag: FeatureFlag; connection: Connection; expiresAt: string }>()
  for (const { connection, flags } of allEnvFlags) {
    for (const flag of flags) {
      if (flag.isPermanent || !flag.expiresAt) continue
      const key = `${connection.id}-${flag.id}`
      const existing = soonest.get(key)
      if (!existing || flag.expiresAt < existing.expiresAt) {
        soonest.set(key, { flag, connection, expiresAt: flag.expiresAt })
      }
    }
  }

  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() + RETIREMENT_WARNING_DAYS)

  const dueFlags = Array.from(soonest.values())
    .filter(({ expiresAt }) => new Date(expiresAt) <= cutoff)
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))

  const overdue = dueFlags.filter(({ expiresAt }) => new Date(expiresAt).getTime() < now)
  const overdueCount = overdue.length
  // The card spans connections, so the badge only links when every overdue flag
  // sits in one — otherwise there is no single list that shows them all.
  const overdueConnections = new Set(overdue.map(({ connection }) => connection.id))
  const overdueHref =
    overdueConnections.size === 1
      ? `/connections/${overdue[0].connection.id}/flags?status=overdue`
      : null

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg p-1.5 bg-amber-subtle">
              <Timer className="h-3.5 w-3.5 text-amber" />
            </div>
            <CardTitle className="text-base">Needs Retirement</CardTitle>
          </div>
          {overdueCount > 0 &&
            (overdueHref ? (
              <Link to={overdueHref}>
                <Badge className="bg-rose-subtle text-rose border-0 text-xs font-medium hover:bg-rose-subtle/70">
                  {overdueCount} overdue
                </Badge>
              </Link>
            ) : (
              <Badge className="bg-rose-subtle text-rose border-0 text-xs font-medium">
                {overdueCount} overdue
              </Badge>
            ))}
        </div>
        <CardDescription>
          Flags past or within {RETIREMENT_WARNING_DAYS} days of their retire-by date
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : dueFlags.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald" />
            Nothing needs retiring — all flags are within their dates.
          </p>
        ) : (
          <div className="space-y-1">
            {dueFlags.map(({ flag, connection, expiresAt }) => {
              const daysLeft = Math.ceil(
                (new Date(expiresAt).getTime() - now) / 86_400_000
              )
              const overdue = daysLeft < 0
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
                      {connection.name} &middot;{' '}
                      {flag.ownerEmail
                        ? `owned by ${flag.ownerEmail.split('@')[0]}`
                        : 'no owner'}
                    </p>
                  </div>
                  <Badge
                    className={`shrink-0 ml-3 text-xs border-0 font-medium ${
                      overdue ? 'bg-rose-subtle text-rose' : 'bg-amber-subtle text-amber'
                    }`}
                  >
                    {overdue
                      ? `Overdue by ${-daysLeft}d`
                      : daysLeft === 0
                        ? 'Due today'
                        : `Due in ${daysLeft}d`}
                  </Badge>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
