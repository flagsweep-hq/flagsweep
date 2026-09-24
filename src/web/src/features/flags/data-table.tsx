import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { STATUS_KEYS, STATUS_LABELS } from './flagStatuses'

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  isLoading?: boolean
  /** Status to start filtered by, as the dashboard links in with. */
  initialStatus?: string | null
}

export function DataTable<TData>({ columns, data, isLoading, initialStatus }: DataTableProps<TData>) {
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() =>
    initialStatus ? [{ id: 'status', value: initialStatus }] : [],
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    state: { globalFilter, columnFilters },
    globalFilterFn: 'includesString',
  })

  const ownerFilter = (columnFilters.find(f => f.id === 'owner')?.value as string) ?? 'all'
  const statusFilter = (columnFilters.find(f => f.id === 'status')?.value as string) ?? 'all'

  const statusColumn = table.getAllColumns().find(c => c.id === 'status')
  // Only offer statuses some row actually has, so the list never dead-ends —
  // plus whatever is selected, so a link in from the dashboard is never dropped.
  const presentStatuses = new Set<string>()
  if (statusColumn) {
    for (const row of table.getPreFilteredRowModel().rows) {
      const keys = row.getValue<string[]>('status')
      if (Array.isArray(keys)) keys.forEach(k => presentStatuses.add(k))
    }
    if (statusFilter !== 'all') presentStatuses.add(statusFilter)
  }
  const statusOptions = STATUS_KEYS.filter(k => presentStatuses.has(k))

  const ownerColumn = table.getAllColumns().find(c => c.id === 'owner')
  const ownerOptions = ownerColumn
    ? [...new Set(
        table.getPreFilteredRowModel().rows
          .map(row => row.getValue<string>('owner'))
          .filter(email => email !== '')
      )].sort()
    : []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search flags..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        {statusColumn && statusOptions.length > 0 && (
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setColumnFilters(prev =>
                value === 'all'
                  ? prev.filter(f => f.id !== 'status')
                  : [...prev.filter(f => f.id !== 'status'), { id: 'status', value }]
              )
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              {statusOptions.map(key => (
                <SelectItem key={key} value={key}>{STATUS_LABELS[key]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {ownerColumn && (
          <Select
            value={ownerFilter}
            onValueChange={(value) => {
              setColumnFilters(prev =>
                value === 'all'
                  ? prev.filter(f => f.id !== 'owner')
                  : [...prev.filter(f => f.id !== 'owner'), { id: 'owner', value }]
              )
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any owner</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {ownerOptions.map(email => (
                <SelectItem key={email} value={email}>{email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground">
                  {globalFilter || ownerFilter !== 'all' || statusFilter !== 'all'
                    ? 'No flags match your filters.'
                    : 'No flags yet. Create your first feature flag.'}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">
        {table.getFilteredRowModel().rows.length} flag{table.getFilteredRowModel().rows.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
