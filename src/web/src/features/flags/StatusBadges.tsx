import { Badge } from '@/components/ui/badge'
import type { FlagStatus } from './flagStatuses'

/**
 * The Status cell, shared by the connection's flag list and an environment's own
 * table. `data-status` carries each badge's key so tests and styling have a
 * stable hook that does not depend on the visible wording.
 */
export function StatusBadges({ statuses }: { statuses: FlagStatus[] }) {
  if (statuses.length === 0) return <span className="text-muted-foreground">--</span>

  return (
    <div className="flex flex-wrap items-center gap-1">
      {statuses.map((status) => {
        const Icon = status.icon
        return (
          <Badge
            key={status.key}
            data-status={status.key}
            className={`border-0 font-medium text-xs gap-1 whitespace-nowrap ${status.className}`}
            title={status.title}
          >
            {Icon && <Icon className="h-3 w-3" />}
            {status.label}
          </Badge>
        )
      })}
    </div>
  )
}
