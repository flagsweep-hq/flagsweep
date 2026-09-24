import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { OwnerCell } from './OwnerCell'
import { lastModifiedCell, ownerFilterFn, retireByCell } from './flagCells'
import { StatusBadges } from './StatusBadges'
import { flagCopyStatuses } from './flagStatuses'
import { statusFilterFn } from './statusFilter'
import { Pencil, Trash2, Loader2, Lock, LockOpen } from 'lucide-react'
import type { FeatureFlag } from '@/types/flag'
import type { AssignableUser } from '@/types/auth'

export interface EnvironmentFlagColumnCallbacks {
  onToggleClick: (flag: FeatureFlag) => void
  onEditClick: (flag: FeatureFlag) => void
  onDeleteClick: (flag: FeatureFlag) => void
  onLockClick?: (flag: FeatureFlag) => void
  onOwnerChange?: (flag: FeatureFlag, userId: string | null) => void
  assignableUsers?: AssignableUser[]
  canModify?: boolean
  isAdmin?: boolean
  /**
   * The baseline environment's copies, keyed by flag id, so each row can say
   * whether it disagrees with it. Null when this table *is* the baseline.
   */
  baseline?: { name: string; flags: Map<string, FeatureFlag> } | null
}

export function createEnvironmentFlagColumns(callbacks: EnvironmentFlagColumnCallbacks): ColumnDef<FeatureFlag>[] {
  const canModify = callbacks.canModify !== false
  const baselineFor = (flag: FeatureFlag) =>
    callbacks.baseline
      ? { name: callbacks.baseline.name, copy: callbacks.baseline.flags.get(flag.id) ?? null }
      : null
  return [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <span className="text-sm font-mono text-muted-foreground truncate max-w-48 block">
          {row.original.id}
        </span>
      ),
    },
    {
      accessorKey: 'displayName',
      header: 'Name',
      cell: ({ row }) => (
        <span className="text-sm truncate">
          {row.original.displayName ?? row.original.id}
        </span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate">
          {row.original.description ?? '--'}
        </span>
      ),
    },
    {
      accessorKey: 'isEnabled',
      header: 'Enabled',
      cell: ({ row }) => {
        const flag = row.original
        const isPending = flag.deployStatus === 'pending'
        const isDeploying = flag.deployStatus === 'deploying'
        const isFailed = flag.deployStatus === 'failed'

        if (isDeploying) {
          return (
            <Badge className="border-0 font-medium bg-amber-subtle text-amber text-xs">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Deploying
            </Badge>
          )
        }

        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={flag.isEnabled}
              onCheckedChange={() => canModify && !flag.isLocked && callbacks.onToggleClick(flag)}
              disabled={!canModify || flag.isLocked}
            />
            {isPending && (
              <Badge className="border-0 font-medium bg-sky-subtle text-sky text-xs">
                <span className="inline-block h-1.5 w-1.5 rounded-full mr-1 bg-sky animate-pulse" />
                Pending
              </Badge>
            )}
            {isFailed && (
              <Badge className="border-0 font-medium bg-rose-subtle text-rose text-xs">
                Failed
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (flag) => flagCopyStatuses(flag, baselineFor(flag)).map((s) => s.key),
      cell: ({ row }) => (
        <StatusBadges statuses={flagCopyStatuses(row.original, baselineFor(row.original))} />
      ),
      filterFn: statusFilterFn,
    },
    {
      id: 'owner',
      accessorFn: (flag) => flag.ownerEmail ?? '',
      header: 'Owner',
      cell: ({ row }) => (
        <OwnerCell
          owner={row.original}
          flagName={row.original.displayName ?? row.original.id}
          users={callbacks.assignableUsers ?? []}
          canAssign={canModify && !!callbacks.onOwnerChange}
          onChange={(userId) => callbacks.onOwnerChange?.(row.original, userId)}
        />
      ),
      filterFn: ownerFilterFn,
    },
    {
      accessorKey: 'expiresAt',
      header: 'Retire by',
      cell: ({ row }) => retireByCell(row.original.isPermanent, row.original.expiresAt),
    },
    {
      accessorKey: 'lastModified',
      header: 'Last Modified',
      cell: ({ row }) => lastModifiedCell(row.original.lastModified),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const flag = row.original
        return (
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => callbacks.onEditClick(flag)}
              className="text-muted-foreground hover:text-foreground"
              disabled={!canModify || flag.isLocked}
              title="Edit flag details"
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit {flag.displayName ?? flag.id}</span>
            </Button>
            {callbacks.isAdmin && callbacks.onLockClick && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => callbacks.onLockClick!(flag)}
                className="text-muted-foreground hover:text-foreground"
                title={flag.isLocked ? 'Unlock flag in the store' : 'Lock flag in the store'}
              >
                {flag.isLocked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                <span className="sr-only">
                  {flag.isLocked ? 'Unlock' : 'Lock'} {flag.displayName ?? flag.id}
                </span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => callbacks.onDeleteClick(flag)}
              className="text-muted-foreground hover:text-destructive"
              disabled={!canModify || flag.isLocked}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete {flag.displayName ?? flag.id}</span>
            </Button>
          </div>
        )
      },
    },
  ]
}
