import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useConnection } from '@/hooks/useConnections'
import { useReorderEnvironments, useAddEnvironment, useUpdateEnvironment, useDeleteEnvironment } from '@/hooks/useEnvironments'
import { setEnvironmentProtection } from '@/api/environmentsApi'
import { fetchConnectionLabels } from '@/api/connectionsApi'
import { EnvironmentList } from './EnvironmentList'
import { ConnectionCredentials } from './ConnectionCredentials'
import { useAuth } from '@/contexts/AuthContext'
import { Plus } from 'lucide-react'
import type { ConnectionEnvironment } from '@/types/connection'

interface ConnectionSettingsProps {
  connectionId: number
}

export function ConnectionSettings({ connectionId }: ConnectionSettingsProps) {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const { data: connection, isLoading } = useConnection(connectionId)
  const reorderEnvironments = useReorderEnvironments(connectionId)
  const addEnvironment = useAddEnvironment(connectionId)
  const updateEnv = useUpdateEnvironment(connectionId)
  const deleteEnv = useDeleteEnvironment(connectionId)

  function handleReorder(reordered: ConnectionEnvironment[]) {
    reorderEnvironments.mutate({
      environmentIds: reordered.map((e) => e.id),
    })
  }

  async function handleToggleProtection(envId: number, isProtected: boolean) {
    await setEnvironmentProtection(connectionId, envId, isProtected)
    queryClient.invalidateQueries({ queryKey: ['connections'] })
    queryClient.invalidateQueries({ queryKey: ['connections', connectionId] })
  }

  const [discoveredEnvs, setDiscoveredEnvs] = useState<{ id: string; name: string }[]>([])
  const [envsLoading, setEnvsLoading] = useState(false)
  const [showAddEnv, setShowAddEnv] = useState(false)
  const [envMode, setEnvMode] = useState<'import' | 'create'>('import')
  const [selectedEnvId, setSelectedEnvId] = useState('')
  const [newEnvName, setNewEnvName] = useState('')
  const [newEnvLabel, setNewEnvLabel] = useState('')

  async function handleShowAddEnv() {
    setShowAddEnv(true)
    setEnvMode('import')
    if (!connection) return
    setEnvsLoading(true)
    const existingLabels = new Set(connection.environments.map((e) => e.environmentKey).filter(Boolean))
    try {
      const labels = await fetchConnectionLabels(connectionId)
      setDiscoveredEnvs(labels.filter((l) => !existingLabels.has(l)).map((l) => ({ id: l, name: l })))
    } catch {
      setDiscoveredEnvs([])
    } finally {
      setEnvsLoading(false)
    }
  }

  async function handleAddEnv() {
    if (envMode === 'import') {
      const env = discoveredEnvs.find((e) => e.id === selectedEnvId)
      if (!env) return
      addEnvironment.mutate({ name: env.name, environmentKey: env.name }, {
        onSuccess: () => {
          setShowAddEnv(false)
          setSelectedEnvId('')
          setDiscoveredEnvs([])
        },
      })
    } else {
      if (!newEnvName.trim() || !connection) return
      addEnvironment.mutate({ name: newEnvName.trim(), environmentKey: newEnvLabel.trim() || null }, {
        onSuccess: () => {
          setShowAddEnv(false)
          setNewEnvName('')
          setNewEnvLabel('')
        },
      })
    }
  }

  if (isLoading || !connection) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-8">
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Store</h3>
          <p className="text-xs text-muted-foreground">
            The flag store this connection reads and writes. One store can back only one connection.
          </p>
        </div>
        <ConnectionCredentials connection={connection} />
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Environments</h3>
          <p className="text-xs text-muted-foreground">
            Environments map to Azure labels. Import labels or add custom environments. Drag to reorder.
          </p>
        </div>
        <EnvironmentList
          environments={connection.environments}
          onReorder={handleReorder}
          onEdit={(envId, envName, envKey) => updateEnv.mutate({ environmentId: envId, name: envName, environmentKey: envKey ?? '' })}
          onDelete={(envId) => deleteEnv.mutate(envId)}
          onToggleProtection={isAdmin ? handleToggleProtection : undefined}
          showProtection={isAdmin}
        />

        {showAddEnv && (
          <div className="rounded-md border p-3 space-y-3">
            <div className="flex gap-2">
              <Button
                variant={envMode === 'import' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEnvMode('import')}
              >
                Import from labels
              </Button>
              <Button
                variant={envMode === 'create' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEnvMode('create')}
              >
                Add custom
              </Button>
            </div>

            {envMode === 'import' ? (
              envsLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : discoveredEnvs.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Select a label to map as an environment
                  </p>
                  <Select value={selectedEnvId} onValueChange={setSelectedEnvId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select label..." />
                    </SelectTrigger>
                    <SelectContent>
                      {discoveredEnvs.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No new labels found. Add a custom environment instead.
                </p>
              )
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Environment name and optional Azure label to filter flags by
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. staging"
                    value={newEnvName}
                    onChange={(e) => setNewEnvName(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Label (optional)"
                    value={newEnvLabel}
                    onChange={(e) => setNewEnvLabel(e.target.value)}
                    className="w-36"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowAddEnv(false); setSelectedEnvId(''); setNewEnvName(''); setNewEnvLabel('') }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddEnv}
                disabled={
                  addEnvironment.isPending ||
                  (envMode === 'import' ? !selectedEnvId : !newEnvName.trim())
                }
              >
                {addEnvironment.isPending ? 'Adding...' : 'Add Environment'}
              </Button>
            </div>
          </div>
        )}

        {!showAddEnv && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleShowAddEnv}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Environment
          </Button>
        )}
      </section>
    </div>
  )
}
