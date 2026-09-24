import { useMemo, useState } from 'react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Shield } from 'lucide-react'
import { DataTable } from './data-table'
import { createEnvironmentFlagColumns } from './environmentFlagColumns'
import { EditFlagModal } from './EditFlagModal'
import { CreateFlagModal } from './CreateFlagModal'
import { ToggleConfirmDialog } from './ToggleConfirmDialog'
import { baselineEnvironment } from './flagStatuses'
import { useFlags } from '@/hooks/useFlags'
import { useToggleFlag, useCreateFlag, useUpdateFlagDetails, useDeleteFlag, useSetFlagLock, useSetFlagOwner } from '@/hooks/useFlagMutations'
import { useAssignableUsers } from '@/hooks/useUsers'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import type { FeatureFlag } from '@/types/flag'
import type { ConnectionEnvironment } from '@/types/connection'

function DeleteConfirmDialog({
  flag, open, onConfirm, onCancel, isDeleting
}: {
  flag: FeatureFlag; open: boolean; onConfirm: () => void; onCancel: () => void; isDeleting: boolean
}) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete flag permanently?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{flag.displayName ?? flag.id}</strong> will be deleted from Azure App
            Configuration in this environment. This cannot be undone, and any application
            still reading this flag will fall back to its own default. Its audit history in
            Flagsweep is kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface EnvironmentFlagTableProps {
  connectionId: number
  environmentId: number
  environments: ConnectionEnvironment[]
  label: string | null
  isProtected?: boolean
}

export function EnvironmentFlagTable({
  connectionId,
  environmentId,
  environments,
  label,
  isProtected = false,
}: EnvironmentFlagTableProps) {
  const { isAdmin } = useAuth()
  const canModify = !isProtected || isAdmin

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [pendingToggleFlag, setPendingToggleFlag] = useState<FeatureFlag | null>(null)
  const [pendingDeleteFlag, setPendingDeleteFlag] = useState<FeatureFlag | null>(null)
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null)

  const { data: flags = [], isLoading } = useFlags(connectionId, label)

  // The Status column marks flags switched differently from the baseline, so it
  // needs that environment's copies too. When this table already is the
  // baseline, the label matches and react-query serves the same cached query.
  const baseline = baselineEnvironment(environments)
  const isBaseline = baseline === null || baseline.id === environmentId
  const { data: baselineFlags = [] } = useFlags(
    connectionId,
    baseline ? baseline.environmentKey : label,
  )
  const baselineColumn = useMemo(
    () =>
      isBaseline || !baseline
        ? null
        : { name: baseline.name, flags: new Map(baselineFlags.map((f) => [f.id, f])) },
    [isBaseline, baseline, baselineFlags],
  )

  const toggleMutation = useToggleFlag(connectionId, label)
  const createMutation = useCreateFlag(connectionId)
  const detailsMutation = useUpdateFlagDetails(connectionId, label)
  const deleteMutation = useDeleteFlag(connectionId, label)
  const lockMutation = useSetFlagLock(connectionId, label)
  const ownerMutation = useSetFlagOwner(connectionId)
  const { data: assignableUsers = [] } = useAssignableUsers()

  function handleDeleteConfirm() {
    if (!pendingDeleteFlag) return
    deleteMutation.mutate(pendingDeleteFlag.id, {
      onSettled: () => setPendingDeleteFlag(null),
    })
  }

  function handleToggleConfirm(flag: FeatureFlag) {
    toggleMutation.mutate(flag, {
      onSuccess: () => setPendingToggleFlag(null),
      onError: () => setPendingToggleFlag(null),
    })
  }

  const columns = createEnvironmentFlagColumns({
    onToggleClick: (flag) => setPendingToggleFlag(flag),
    onEditClick: (flag) => setEditingFlag(flag),
    onDeleteClick: (flag) => setPendingDeleteFlag(flag),
    onLockClick: (flag) => lockMutation.mutate({ flag, locked: !flag.isLocked }),
    onOwnerChange: (flag, userId) => ownerMutation.mutate({ flagId: flag.id, userId }),
    assignableUsers,
    canModify,
    isAdmin,
    baseline: baselineColumn,
  })

  return (
    <div className="space-y-4">
      {isProtected && !isAdmin && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Shield className="h-4 w-4 shrink-0" />
          <span>This environment is protected. Only admins can modify flags.</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Feature Flags</h2>
          {isProtected && (
            <Shield className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          disabled={!canModify}
        >
          New Flag
        </Button>
      </div>

      <DataTable columns={columns} data={flags} isLoading={isLoading} />

      <CreateFlagModal
        open={isCreateModalOpen}
        environments={environments}
        currentEnvironmentId={environmentId}
        canModifyProtected={isAdmin}
        assignableUsers={assignableUsers}
        onClose={() => setIsCreateModalOpen(false)}
        isSubmitting={createMutation.isPending}
        onSubmit={(values) => {
          createMutation.mutate(values, {
            onSuccess: () => {
              setIsCreateModalOpen(false)
              if (values.labels.length > 1) {
                toast.success(`Created "${values.id}" in ${values.labels.length} environments`)
              }
            },
          })
        }}
      />

      <ToggleConfirmDialog
        flag={pendingToggleFlag}
        open={pendingToggleFlag !== null}
        onConfirm={() => {
          if (pendingToggleFlag) {
            handleToggleConfirm(pendingToggleFlag)
          }
        }}
        onCancel={() => setPendingToggleFlag(null)}
      />

      <EditFlagModal
        flag={editingFlag}
        assignableUsers={assignableUsers}
        onClose={() => setEditingFlag(null)}
        isSubmitting={detailsMutation.isPending}
        onSubmit={(id, req, ownerId) => {
          // Ownership lives in Flagsweep's own DB, the rest in the store, so the
          // two travel on separate endpoints.
          if (ownerId !== (editingFlag?.ownerId ?? null)) {
            ownerMutation.mutate({ flagId: id, userId: ownerId })
          }
          detailsMutation.mutate({ id, req }, { onSuccess: () => setEditingFlag(null) })
        }}
      />

      {pendingDeleteFlag && (
        <DeleteConfirmDialog
          flag={pendingDeleteFlag}
          open={true}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setPendingDeleteFlag(null)}
          isDeleting={deleteMutation.isPending}
        />
      )}

    </div>
  )
}
