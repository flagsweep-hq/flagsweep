import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateConnection, useDiscoverStore } from '@/hooks/useConnections'
import { apiErrorMessage } from '@/api/client'
import { Loader2 } from 'lucide-react'
import type {
  Connection,
  CreateEnvironmentRequest,
  ProviderType,
  StoreMetadata,
} from '@/types/connection'

type WizardStep = 'connect' | 'name' | 'environments'

const PROVIDER_TYPES: { value: ProviderType; label: string }[] = [
  { value: 'Azure', label: 'Azure App Configuration' },
]

interface SetupWizardProps {
  onComplete: (connection: Connection) => void
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState<WizardStep>('connect')
  const [providerType, setProviderType] = useState<ProviderType>('Azure')
  const [connectionString, setConnectionString] = useState('')
  const [store, setStore] = useState<StoreMetadata | null>(null)
  const [connectionName, setConnectionName] = useState('')
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set())
  const [customEnvName, setCustomEnvName] = useState('')
  const [customEnvLabel, setCustomEnvLabel] = useState('')
  const [customEnvs, setCustomEnvs] = useState<{ name: string; label: string }[]>([])

  const discoverStore = useDiscoverStore()
  const createConnection = useCreateConnection()

  function handleConnect() {
    const connStr = connectionString.trim()
    if (!connStr) return
    discoverStore.mutate(
      { providerType, connectionString: connStr },
      {
        onSuccess: (result) => {
          setStore(result)
          // A different store invalidates labels picked from the previous one.
          setSelectedLabels(new Set())
          if (!connectionName.trim() && result.storeName) setConnectionName(result.storeName)
          setStep('name')
        },
      },
    )
  }

  function handleLabelToggle(label: string) {
    setSelectedLabels((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  function handleToggleAllLabels() {
    setSelectedLabels((prev) =>
      prev.size === discoveredLabels.length ? new Set() : new Set(discoveredLabels),
    )
  }

  const [duplicateEnvError, setDuplicateEnvError] = useState('')

  function handleAddCustomEnv() {
    const name = customEnvName.trim()
    if (!name) return
    if (customEnvs.some((e) => e.name.toLowerCase() === name.toLowerCase()) ||
        selectedLabels.has(name)) {
      setDuplicateEnvError(`Environment "${name}" already exists.`)
      return
    }
    setDuplicateEnvError('')
    setCustomEnvs((prev) => [...prev, { name, label: customEnvLabel.trim() }])
    setCustomEnvName('')
    setCustomEnvLabel('')
  }

  function handleRemoveCustomEnv(name: string) {
    setCustomEnvs((prev) => prev.filter((e) => e.name !== name))
  }

  function handleCreate() {
    if (!store) return

    const environments: CreateEnvironmentRequest[] = [
      ...Array.from(selectedLabels).map((label) => ({
        name: label,
        environmentKey: label,
      })),
      ...customEnvs.map((env) => ({
        name: env.name,
        environmentKey: env.label || null,
      })),
    ]

    createConnection.mutate(
      {
        name: connectionName.trim(),
        providerType,
        connectionString: connectionString.trim(),
        environments,
      },
      {
        onSuccess: (connection) => {
          onComplete(connection)
        },
      },
    )
  }

  const isNameValid = connectionName.trim().length >= 1 && connectionName.trim().length <= 100
  const discoveredLabels = store?.labels ?? []
  const allLabelsSelected =
    discoveredLabels.length > 0 && selectedLabels.size === discoveredLabels.length
  const allSteps: WizardStep[] = ['connect', 'name', 'environments']

  return (
    <div className="w-full max-w-lg space-y-6">
      <div className="flex items-center justify-center gap-2">
        {allSteps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                s === step ? 'bg-primary' : 'bg-muted'
              }`}
            />
            {i < allSteps.length - 1 && <div className="h-px w-8 bg-muted" />}
          </div>
        ))}
      </div>

      {step === 'connect' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Connect a store</h2>
            <p className="text-sm text-muted-foreground">
              A connection is one flag store. Flagsweep checks that it can reach the store and reads its labels
              before you continue.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Provider</label>
            <Select value={providerType} onValueChange={(v) => setProviderType(v as ProviderType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_TYPES.map((pt) => (
                  <SelectItem key={pt.value} value={pt.value}>
                    {pt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Connection string</label>
            <Input
              type="password"
              placeholder="Endpoint=https://...;Id=...;Secret=..."
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleConnect()
                }
              }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              A read-write access key from Azure Portal: App Configuration &gt; Settings &gt; Access keys
            </p>
          </div>

          {discoverStore.isError && (
            <p className="text-sm text-destructive">
              {apiErrorMessage(discoverStore.error, 'Could not connect to the store.')}
            </p>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleConnect}
              disabled={!connectionString.trim() || discoverStore.isPending}
              className="gap-1.5"
            >
              {discoverStore.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {discoverStore.isPending ? 'Connecting...' : 'Connect'}
            </Button>
          </div>
        </div>
      )}

      {step === 'name' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Connection details</h2>
            {store && (
              <p className="text-sm text-muted-foreground">
                Connected to <span className="font-mono">{store.endpoint}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Connection name</label>
            <Input
              placeholder="e.g. My App"
              value={connectionName}
              onChange={(e) => setConnectionName(e.target.value)}
              autoFocus
              maxLength={100}
            />
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('connect')}>
              Back
            </Button>
            <Button onClick={() => setStep('environments')} disabled={!isNameValid}>
              Next
            </Button>
          </div>
        </div>
      )}

      {step === 'environments' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Environments</h2>
            {store?.storeName && (
              <p className="text-sm font-medium">
                Store: <span className="font-mono text-muted-foreground">{store.storeName}</span>
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Select labels to use as environments, or add custom environments.
            </p>
          </div>

          {discoveredLabels.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Discovered labels</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleToggleAllLabels}
                >
                  {allLabelsSelected ? 'Clear all' : 'Select all'}
                </Button>
              </div>
              <div className="space-y-1">
                {discoveredLabels.map((label) => (
                  <label
                    key={label}
                    className="flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer hover:bg-accent/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedLabels.has(label)}
                      onChange={() => handleLabelToggle(label)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm">{label}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {providerType}
                    </Badge>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No labels found in this store. You can add custom environments below.
            </p>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Custom environments</p>
            {customEnvs.map((env) => (
              <div
                key={env.name}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{env.name}</span>
                  {env.label ? (
                    <Badge variant="secondary" className="text-xs">{env.label}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">No label</Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveCustomEnv(env.name)}
                  className="h-6 text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                placeholder="Environment name"
                value={customEnvName}
                onChange={(e) => { setCustomEnvName(e.target.value); setDuplicateEnvError('') }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddCustomEnv()
                  }
                }}
                className="flex-1"
              />
              <Input
                placeholder="Label"
                value={customEnvLabel}
                onChange={(e) => setCustomEnvLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddCustomEnv()
                  }
                }}
                className="w-32"
              />
              <Button
                variant="outline"
                onClick={handleAddCustomEnv}
                disabled={!customEnvName.trim()}
              >
                Add
              </Button>
            </div>
            {duplicateEnvError && (
              <p className="text-sm text-destructive">{duplicateEnvError}</p>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('name')}>
              Back
            </Button>
            <Button onClick={handleCreate} disabled={createConnection.isPending}>
              {createConnection.isPending ? 'Creating...' : 'Create connection'}
            </Button>
          </div>

          {createConnection.isError && (
            <p className="text-sm text-destructive text-center">
              {apiErrorMessage(createConnection.error, 'Failed to create connection. Please try again.')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
