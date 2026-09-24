import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useConnectionStatus, useUpdateConnectionString } from '@/hooks/useConnections'
import { apiErrorMessage } from '@/api/client'
import { CheckCircle2, Database, KeyRound, Loader2, Plug, XCircle } from 'lucide-react'
import type { ConnectionStatus, Connection } from '@/types/connection'

const PROVIDER_LABELS: Record<Connection['providerType'], string> = {
  Azure: 'Azure App Configuration',
}

export function ConnectionCredentials({ connection }: { connection: Connection }) {
  const testConnection = useConnectionStatus(connection.id)
  const updateConnection = useUpdateConnectionString(connection.id)

  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [showReplace, setShowReplace] = useState(false)
  const [connectionString, setConnectionString] = useState('')
  const [replaced, setReplaced] = useState(false)

  // Placeholder written by the FoldConnectionIntoProject migration, which could not read the
  // endpoint out of an encrypted string; the real one appears once an admin replaces it.
  const isLegacyEndpoint = connection.endpoint.startsWith('legacy:')

  function handleTest() {
    setStatus(null)
    testConnection.mutate(undefined, {
      onSuccess: setStatus,
      onError: (err) =>
        setStatus({
          status: 'failed',
          message: apiErrorMessage(err, 'Connection test failed.'),
          checkedAt: new Date().toISOString(),
        }),
    })
  }

  function handleReplace() {
    const connStr = connectionString.trim()
    if (!connStr) return
    setReplaced(false)
    updateConnection.mutate(
      { connectionString: connStr },
      {
        onSuccess: () => {
          setConnectionString('')
          setShowReplace(false)
          setReplaced(true)
          setStatus(null)
        },
      },
    )
  }

  function handleCancelReplace() {
    setShowReplace(false)
    setConnectionString('')
    updateConnection.reset()
  }

  const isConnected = status?.status === 'connected'

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card">
        <div className="flex items-center gap-3 px-4 py-3">
          <Database className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{PROVIDER_LABELS[connection.providerType]}</p>
            <p className="text-xs text-muted-foreground font-mono truncate" title={connection.endpoint}>
              {isLegacyEndpoint ? 'Endpoint unknown: replace the connection string to record it' : connection.endpoint}
            </p>
          </div>
          <Badge className="text-xs shrink-0 border-0 font-medium bg-sky-subtle text-sky">
            {connection.providerType}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={handleTest}
            disabled={testConnection.isPending}
          >
            {testConnection.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plug className="h-3.5 w-3.5" />
            )}
            Test connection
          </Button>
        </div>

        {status && (
          <div
            className={`flex items-center gap-2 border-t px-4 py-2 text-xs ${
              isConnected
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {isConnected ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <XCircle className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{status.message}</span>
          </div>
        )}
      </div>

      {showReplace ? (
        <div className="rounded-md border p-3 space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">New connection string</label>
            <Input
              type="password"
              placeholder="Endpoint=https://...;Id=...;Secret=..."
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleReplace()
                }
              }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Use this after rotating the store's access keys. The stored key is replaced; it is
              never shown again.
            </p>
          </div>
          {updateConnection.isError && (
            <p className="text-sm text-destructive">
              {apiErrorMessage(updateConnection.error, 'Failed to update the connection string.')}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancelReplace}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleReplace}
              disabled={!connectionString.trim() || updateConnection.isPending}
            >
              {updateConnection.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setReplaced(false)
              setShowReplace(true)
            }}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Replace connection string
          </Button>
          {replaced && (
            <span className="flex items-center gap-1.5 text-xs text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connection string updated.
            </span>
          )}
        </div>
      )}
    </div>
  )
}
