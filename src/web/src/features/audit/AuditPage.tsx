import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BreadcrumbHeader } from '@/components/shared/BreadcrumbHeader'
import { useAuditEntries } from '@/hooks/useAudit'
import type { AuditEntry } from '@/api/auditApi'
import { useConnection } from '@/hooks/useConnections'

function AuditCard({
  entry,
  environmentName,
}: {
  entry: AuditEntry
  environmentName: string | undefined
}) {
  const [expanded, setExpanded] = useState(false)
  const hasChanges = entry.changes.length > 0

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <button
        type="button"
        className="w-full flex items-start gap-3 px-4 py-3 text-left"
        onClick={() => hasChanges && setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="mt-0.5 shrink-0">
          {hasChanges ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <span className="w-4 inline-block" />
          )}
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-sm font-medium truncate">
              {entry.changes[0]?.flagId ?? 'unknown flag'}
            </span>
            {entry.changes[0] && (
              <Badge variant="outline" className="text-xs">
                {entry.changes.length === 1
                  ? entry.changes[0].field
                  : `${entry.changes.length} fields`}
              </Badge>
            )}
            {environmentName && (
              <Badge variant="secondary" className="text-xs">
                {environmentName}
              </Badge>
            )}
          </span>
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="truncate">{entry.triggeredByEmail || entry.triggeredById}</span>
            <time dateTime={entry.createdAt} className="shrink-0 text-xs" title={format(parseISO(entry.createdAt), 'PPpp')}>
              {formatDistanceToNow(parseISO(entry.createdAt), { addSuffix: true })}
            </time>
          </span>
        </span>
      </button>
      {expanded && hasChanges && (
        <div className="border-t px-4 py-3 overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr className="text-muted-foreground text-left">
                <th className="pb-1 pr-3 font-medium">Flag</th>
                <th className="pb-1 pr-3 font-medium">Field</th>
                <th className="pb-1 pr-3 font-medium">From</th>
                <th className="pb-1 font-medium">To</th>
              </tr>
            </thead>
            <tbody>
              {entry.changes.map((change, i) => (
                <tr key={i}>
                  <td className="py-1 pr-3 font-mono">{change.flagId}</td>
                  <td className="py-1 pr-3">{change.field}</td>
                  <td className="py-1 pr-3 text-rose">{change.from ?? '—'}</td>
                  <td className="py-1 text-emerald">{change.to ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function AuditPage() {
  const { connectionId } = useParams<{ connectionId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const numericConnectionId = Number(connectionId)
  const environmentIdParam = searchParams.get('environmentId')
  const environmentId = environmentIdParam ? Number(environmentIdParam) : undefined

  const { data: connection, isLoading: isConnectionLoading } = useConnection(numericConnectionId)
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAuditEntries(numericConnectionId, { environmentId })
  const entries = data?.pages.flatMap((page) => page.items) ?? []

  function handleEnvironmentChange(value: string) {
    setSearchParams((prev) => {
      if (value === 'all') prev.delete('environmentId')
      else prev.set('environmentId', value)
      return prev
    })
  }

  if (isConnectionLoading || !connection) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  const envName = (id: number) => connection.environments.find((e) => e.id === id)?.name

  return (
    <>
      <BreadcrumbHeader connectionName={connection.name} connectionId={connection.id} pageName="Audit" />
      <div className="p-6 page-enter space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Audit Trail</h2>
            <p className="text-sm text-muted-foreground">
              Who changed what, when — every flag write made through Flagsweep.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Environment</Label>
            <Select
              value={environmentId ? String(environmentId) : 'all'}
              onValueChange={handleEnvironmentChange}
            >
              <SelectTrigger className="w-44 h-8 text-sm">
                <SelectValue placeholder="All environments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All environments</SelectItem>
                {connection.environments.map((env) => (
                  <SelectItem key={env.id} value={String(env.id)}>
                    {env.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-muted-foreground text-lg">No audit entries yet</p>
            <p className="text-muted-foreground text-sm mt-2">
              Flag changes made through Flagsweep will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <AuditCard key={entry.id} entry={entry} environmentName={envName(entry.environmentId)} />
            ))}
            {hasNextPage && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load more'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
