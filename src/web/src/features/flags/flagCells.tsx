import type { Row } from '@tanstack/react-table'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

const empty = <span className="text-muted-foreground">--</span>

/** Cell renderers both flag tables share, so the two cannot drift apart. */
export function retireByCell(permanent: boolean, expiresAt: string | null) {
  if (permanent)
    return (
      <span className="text-sm text-muted-foreground" title="Permanent flag — never retired">
        Never
      </span>
    )
  if (!expiresAt) return empty
  const overdue = new Date(expiresAt).getTime() < Date.now()
  try {
    const distance = formatDistanceToNow(parseISO(expiresAt), { addSuffix: true })
    return (
      <span
        className={`text-sm ${overdue ? 'text-rose font-medium' : 'text-muted-foreground'}`}
        title={overdue ? `Retirement overdue — was due ${distance}` : `Retire ${distance}`}
      >
        {format(parseISO(expiresAt), 'MMM d, yyyy')}
      </span>
    )
  } catch {
    return empty
  }
}

export function lastModifiedCell(stamp: string | null) {
  if (!stamp) return empty
  try {
    return (
      <span className="text-sm text-muted-foreground">
        {formatDistanceToNow(parseISO(stamp), { addSuffix: true })}
      </span>
    )
  } catch {
    return empty
  }
}

export function ownerFilterFn<T extends { ownerId: string | null; ownerEmail: string | null }>(
  row: Row<T>,
  _columnId: string,
  filterValue: string,
) {
  if (filterValue === 'all') return true
  if (filterValue === 'unassigned') return !row.original.ownerId
  return row.original.ownerEmail === filterValue
}
