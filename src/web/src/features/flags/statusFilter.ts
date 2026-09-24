import type { Row } from '@tanstack/react-table'

/**
 * Matches a row whose Status column carries the selected key. The column's
 * accessor yields the keys, so this works for both flag tables unchanged.
 */
export function statusFilterFn<TData>(row: Row<TData>, columnId: string, value: string): boolean {
  if (value === 'all') return true
  const keys = row.getValue(columnId)
  return Array.isArray(keys) && keys.includes(value)
}
