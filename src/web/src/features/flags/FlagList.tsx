import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DataTable } from './data-table'
import { createFlagMatrixColumns } from './flagMatrixColumns'
import { CreateFlagModal } from './CreateFlagModal'
import { ToggleConfirmDialog } from './ToggleConfirmDialog'
import {
  useApplyEnvironmentChanges,
  useCreateFlag,
  useSetFlagOwner,
} from '@/hooks/useFlagMutations'
import { useAssignableUsers } from '@/hooks/useUsers'
import { useAuth } from '@/contexts/AuthContext'
import type { FeatureFlag, FlagMatrixRow } from '@/types/flag'
import type { ConnectionEnvironment } from '@/types/connection'

/**
 * The connection's flag-first table: one row per flag, showing how it is rolled out
 * across every environment. Built on the same table as an environment's own flag
 * list so the two read alike; environment tables remain for per-environment work,
 * while this is the view for reasoning about a feature as one thing.
 */
export function FlagList({
  connectionId,
  rows,
  environments,
  isLoading,
  initialStatus,
}: {
  connectionId: number
  rows: FlagMatrixRow[]
  environments: ConnectionEnvironment[]
  isLoading: boolean
  initialStatus?: string | null
}) {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  // A chip click toggles one environment, and still asks first: it writes
  // straight through to Azure with no staging step to reconsider in.
  const [pendingToggle, setPendingToggle] = useState<{
    row: FlagMatrixRow
    env: ConnectionEnvironment
    flag: FeatureFlag
  } | null>(null)

  const createMutation = useCreateFlag(connectionId)
  const ownerMutation = useSetFlagOwner(connectionId)
  const toggleMutation = useApplyEnvironmentChanges(connectionId)
  const { data: assignableUsers = [] } = useAssignableUsers()

  // Creating from here is connection-level, so the dialog's environment list is the
  // whole choice. It seeds with the first environment the user may actually write
  // to -- lowest in the connection's own order, normally dev -- rather than
  // preselecting every environment, or one they would be refused on submit.
  const seedEnvironment = environments.find((e) => !e.isProtected || isAdmin)
  const canCreate = seedEnvironment !== undefined

  const columns = createFlagMatrixColumns({
    connectionId,
    environments,
    assignableUsers,
    isAdmin,
    onOwnerChange: (flag, userId) => ownerMutation.mutate({ flagId: flag.flagId, userId }),
    onToggle: (row, env, flag) => setPendingToggle({ row, env, flag }),
  })

  function confirmToggle() {
    if (!pendingToggle) return
    const { row, env, flag } = pendingToggle
    toggleMutation.mutate(
      {
        flagId: row.flagId,
        template: flag,
        changes: [{ label: env.environmentKey, create: false, enabled: !flag.isEnabled }],
      },
      {
        onSuccess: () =>
          toast.success(
            `${flag.isEnabled ? 'Disabled' : 'Enabled'} "${row.flagId}" in ${env.name}`,
          ),
        onSettled: () => setPendingToggle(null),
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Feature Flags</h2>
          <span className="text-sm text-muted-foreground">
            across {environments.length} environment{environments.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsCreateOpen(true)}
            disabled={!canCreate}
            title={canCreate ? undefined : 'This connection has no environment you can write to'}
          >
            New Flag
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        initialStatus={initialStatus}
      />

      <ToggleConfirmDialog
        flag={pendingToggle?.flag ?? null}
        environmentName={pendingToggle?.env.name}
        open={pendingToggle !== null}
        onConfirm={confirmToggle}
        onCancel={() => setPendingToggle(null)}
      />

      {canCreate && (
        <CreateFlagModal
          open={isCreateOpen}
          environments={environments}
          currentEnvironmentId={seedEnvironment.id}
          canModifyProtected={isAdmin}
          assignableUsers={assignableUsers}
          onClose={() => setIsCreateOpen(false)}
          isSubmitting={createMutation.isPending}
          onSubmit={(values) => {
            createMutation.mutate(values, {
              onSuccess: () => {
                setIsCreateOpen(false)
                toast.success(
                  `Created "${values.id}" in ${values.labels.length} environment${values.labels.length === 1 ? '' : 's'}`,
                )
                // Land on the new flag so its rollout is the next thing you see.
                navigate(`/connections/${connectionId}/flags/${encodeURIComponent(values.id)}`)
              },
            })
          }}
        />
      )}
    </div>
  )
}
