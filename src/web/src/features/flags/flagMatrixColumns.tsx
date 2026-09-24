import { Link } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { ChevronRight } from 'lucide-react'
import { EnvironmentStrip } from './EnvironmentStrip'
import { OwnerCell } from './OwnerCell'
import { lastModifiedCell, ownerFilterFn, retireByCell } from './flagCells'
import { rolloutSummary } from './flagEnvironmentEdits'
import { flagStatuses, retirement } from './flagStatuses'
import { StatusBadges } from './StatusBadges'
import { statusFilterFn } from './statusFilter'
import type { AssignableUser } from '@/types/auth'
import type { FeatureFlag, FlagMatrixRow } from '@/types/flag'
import type { ConnectionEnvironment } from '@/types/connection'

/** The newest write across every copy — when this flag was last touched at all. */
function lastModifiedAcross(row: FlagMatrixRow): string | null {
  const stamps = row.copies
    .map((c) => c.lastModified)
    .filter((s): s is string => s !== null)
    .sort()
  return stamps.length > 0 ? stamps[stamps.length - 1] : null
}

/**
 * Columns for the flag-first table. Deliberately mirrors the per-environment
 * table's shape — ID, name, description, state, owner, retire-by — with the
 * single Enabled switch replaced by the rollout across every environment.
 */
export function createFlagMatrixColumns({
  connectionId,
  environments,
  assignableUsers = [],
  isAdmin = false,
  onOwnerChange,
  onToggle,
}: {
  connectionId: number
  environments: ConnectionEnvironment[]
  assignableUsers?: AssignableUser[]
  isAdmin?: boolean
  /** Ownership is connection-wide, so it can be reassigned straight from the list. */
  onOwnerChange?: (row: FlagMatrixRow, userId: string | null) => void
  /** Enables the rollout chips as one-click per-environment toggles. */
  onToggle?: (row: FlagMatrixRow, env: ConnectionEnvironment, flag: FeatureFlag) => void
}): ColumnDef<FlagMatrixRow, unknown>[] {
  return [
    {
      accessorKey: 'flagId',
      header: 'ID',
      cell: ({ row }) => (
        <span className="text-sm font-mono text-muted-foreground truncate max-w-48 block">
          {row.original.flagId}
        </span>
      ),
    },
    {
      accessorKey: 'displayName',
      header: 'Name',
      cell: ({ row }) => (
        <Link
          to={`/connections/${connectionId}/flags/${encodeURIComponent(row.original.flagId)}`}
          className="text-sm truncate hover:underline"
        >
          {row.original.displayName ?? row.original.flagId}
        </Link>
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
      id: 'rollout',
      header: 'Rollout',
      cell: ({ row }) => (
        <>
          <EnvironmentStrip
            flagName={row.original.displayName ?? row.original.flagId}
            copies={row.original.copies}
            environments={environments}
            isAdmin={isAdmin}
            onToggle={
              onToggle ? (env, flag) => onToggle(row.original, env, flag) : undefined
            }
          />
          <span className="sr-only">{rolloutSummary(row.original.copies, environments)}</span>
        </>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      // The keys are the accessor value so the shared table can offer them as
      // filter options without knowing what a flag status is.
      accessorFn: (row) => flagStatuses(row, environments).map((s) => s.key),
      cell: ({ row }) => <StatusBadges statuses={flagStatuses(row.original, environments)} />,
      filterFn: statusFilterFn,
    },
    {
      id: 'owner',
      accessorFn: (row) => row.ownerEmail ?? '',
      header: 'Owner',
      cell: ({ row }) => (
        <OwnerCell
          owner={row.original}
          flagName={row.original.displayName ?? row.original.flagId}
          users={assignableUsers}
          canAssign={!!onOwnerChange}
          onChange={(userId) => onOwnerChange?.(row.original, userId)}
        />
      ),
      filterFn: ownerFilterFn,
    },
    {
      id: 'expiresAt',
      header: 'Retire by',
      cell: ({ row }) => {
        const { permanent, expiresAt } = retirement(row.original)
        return retireByCell(permanent, expiresAt)
      },
    },
    {
      id: 'lastModified',
      header: 'Last Modified',
      cell: ({ row }) => lastModifiedCell(lastModifiedAcross(row.original)),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end">
          <Link
            to={`/connections/${connectionId}/flags/${encodeURIComponent(row.original.flagId)}`}
            className="inline-flex items-center text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">
              Open {row.original.displayName ?? row.original.flagId}
            </span>
          </Link>
        </div>
      ),
    },
  ]
}
