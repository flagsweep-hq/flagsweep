import { Link } from 'react-router'
import { FolderOpen, Layers, Flag, ArrowLeftRight } from 'lucide-react'
import { Card, CardHeader, CardContent, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Connection } from '@/types/connection'

const STAT_STYLES = [
  { iconBg: 'bg-violet-subtle', iconColor: 'text-violet', accentBorder: 'border-l-violet' },
  { iconBg: 'bg-teal-subtle', iconColor: 'text-teal', accentBorder: 'border-l-teal' },
  { iconBg: 'bg-flamingo-subtle', iconColor: 'text-flamingo', accentBorder: 'border-l-flamingo' },
  { iconBg: 'bg-amber-subtle', iconColor: 'text-amber', accentBorder: 'border-l-amber' },
]

export function StatsCards({
  connections,
  totalFlags,
  totalDrifted,
  isLoading,
}: {
  connections: Connection[]
  totalFlags: number
  totalDrifted: number
  isLoading: boolean
}) {
  // A count spanning several connections has no single place to land, so the tile
  // only becomes a link when there is exactly one connection to open.
  const soleConnection = connections.length === 1 ? connections[0] : null

  const stats = [
    {
      label: 'Connections',
      value: connections.length,
      icon: FolderOpen,
    },
    {
      label: 'Environments',
      value: connections.reduce((sum, p) => sum + p.environments.length, 0),
      icon: Layers,
    },
    {
      label: 'Total Flags',
      value: totalFlags,
      icon: Flag,
    },
    {
      label: 'Drift',
      value: totalDrifted,
      icon: ArrowLeftRight,
      href:
        soleConnection && totalDrifted > 0
          ? `/connections/${soleConnection.id}/flags?status=drift`
          : undefined,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat, i) => {
        const style = STAT_STYLES[i]
        const card = (
          <Card
            className={`gap-3 py-4 border-l-[3px] ${style.accentBorder} transition-shadow hover:shadow-md animate-slide-up stagger-${i + 1} ${stat.href ? 'cursor-pointer' : ''}`}
          >
            <CardHeader className="flex-row items-center justify-between py-0">
              <CardDescription className="font-medium">{stat.label}</CardDescription>
              <div className={`rounded-lg p-1.5 ${style.iconBg}`}>
                <stat.icon className={`h-3.5 w-3.5 ${style.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-2xl font-bold tabular-nums">{stat.value}</span>
              )}
            </CardContent>
          </Card>
        )
        return stat.href ? (
          <Link key={stat.label} to={stat.href} className="block">
            {card}
          </Link>
        ) : (
          <div key={stat.label}>{card}</div>
        )
      })}
    </div>
  )
}
