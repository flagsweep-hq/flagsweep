import { retirement } from './flagStatuses'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { Lock, Pencil, Shield, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Form } from '@/components/ui/form'
import { CreateCopyNote, FlagEnvironmentRows } from './FlagEnvironmentEditor'
import { changeSummary, useFlagEnvironmentEdits } from './flagEnvironmentEdits'
import { FlagDetailsFields } from './FlagDetailsFields'
import {
  flagDetailsDefaults,
  flagDetailsSchema,
  toUpdateFlagRequest,
  type FlagDetailsValues,
} from './flagDetailsForm'
import {
  useApplyEnvironmentChanges,
  useDeleteFlagEverywhere,
  useSetFlagOwner,
  useUpdateFlagEverywhere,
} from '@/hooks/useFlagMutations'
import { useAssignableUsers } from '@/hooks/useUsers'
import { useAuth } from '@/contexts/AuthContext'
import type { FlagMatrixRow } from '@/types/flag'
import type { ConnectionEnvironment } from '@/types/connection'

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm mt-0.5">{children}</dd>
    </div>
  )
}

function safeDate(iso: string): string {
  try {
    return format(parseISO(iso), 'MMM d, yyyy')
  } catch {
    return '--'
  }
}

/**
 * One flag, everywhere it exists. The flag-first counterpart to an environment's
 * table: rollout state, the facts that are true connection-wide, and every control
 * that acts on the flag as a whole.
 */
export function FlagDetail({
  connectionId,
  row,
  environments,
}: {
  connectionId: number
  row: FlagMatrixRow
  environments: ConnectionEnvironment[]
}) {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const applyMutation = useApplyEnvironmentChanges(connectionId)
  const metadataMutation = useUpdateFlagEverywhere(connectionId)
  const ownerMutation = useSetFlagOwner(connectionId)
  const deleteMutation = useDeleteFlagEverywhere(connectionId)
  const { data: assignableUsers = [] } = useAssignableUsers()

  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Editing happens in place on this page rather than in a dialog: the page is
  // already about this one flag, so a modal would only cover it up.
  const representative = row.copies[0] ?? null
  const form = useForm<FlagDetailsValues>({
    resolver: zodResolver(flagDetailsSchema),
    defaultValues: flagDetailsDefaults(representative),
  })

  // Re-seed when entering edit mode, so a cancelled edit leaves nothing behind
  // and a refetch while reading does not fight the form.
  useEffect(() => {
    if (isEditing) form.reset(flagDetailsDefaults(representative))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, row.flagId])


  const flagName = row.displayName ?? row.flagId
  const {
    desired,
    update,
    changes,
    addCount,
    toggleCount,
    lockCount,
    unlockCount,
    template,
  } = useFlagEnvironmentEdits({
    flagId: row.flagId,
    copies: row.copies,
    environments,
    isAdmin,
  })

  const { permanent, expiresAt: retireBy } = retirement(row)
  const lockedIn = environments.filter((e) =>
    row.copies.some((c) => (c.label ?? '') === (e.environmentKey ?? '') && c.isLocked),
  )

  // Metadata and deletion touch every copy, so they are refused outright when
  // any copy sits somewhere the user cannot write. Saying so up front beats
  // half-applying and stopping on a refusal.
  const blockedBy = environments.filter(
    (e) =>
      e.isProtected &&
      !isAdmin &&
      row.copies.some((c) => (c.label ?? '') === (e.environmentKey ?? '')),
  )
  const lockedAnywhere = row.copies.some((c) => c.isLocked)
  const canEditAll = blockedBy.length === 0 && !lockedAnywhere
  const editBlockedReason = lockedAnywhere
    ? `Locked in ${lockedIn.map((e) => e.name).join(', ')} — unlock to modify`
    : blockedBy.length > 0
      ? `Protected in ${blockedBy.map((e) => e.name).join(', ')} — admins only`
      : undefined

  // Stated on the page rather than left in a tooltip: a disabled button with no
  // visible reason is just a dead end.
  const blockedNotice = lockedAnywhere
    ? {
        icon: 'lock' as const,
        title: `This flag is locked in ${lockedIn.map((e) => e.name).join(' and ')}.`,
        body:
          "A lock is the store's own read-only bit on the whole setting, and the name, " +
          'description, retire-by date and value all live inside it — so none of them can ' +
          'change while the lock is held. Release it on the rollout row below and press ' +
          'Apply changes, then edit.',
      }
    : blockedBy.length > 0
      ? {
          icon: 'shield' as const,
          title: `This flag exists in ${blockedBy.map((e) => e.name).join(' and ')}, which ${blockedBy.length === 1 ? 'is' : 'are'} protected.`,
          body:
            'Editing and deleting write to every environment holding the flag, and only ' +
            'admins can write to a protected one. Ask an admin, or have the flag removed ' +
            'from that environment first.',
        }
      : null

  const presentLabels = row.copies.map((c) => c.label)

  // The owner may work the lock on their own flag, so they are not left waiting
  // on an admin for a flag they are accountable for.
  const isOwner = !!user && !!row.ownerId && row.ownerId === user.id
  const canLock = isAdmin || isOwner

  function apply() {
    if (!template) return
    applyMutation.mutate(
      { flagId: row.flagId, template, changes },
      {
        onSuccess: () =>
          toast.success(
            `Updated "${row.flagId}" in ${changes.length} environment${changes.length === 1 ? '' : 's'}`,
          ),
      },
    )
  }

  function saveDetails(values: FlagDetailsValues) {
    // Ownership lives in Flagsweep's own DB and is connection-wide; the rest lives
    // in the store, once per environment.
    if (values.ownerId !== (row.ownerId ?? null)) {
      ownerMutation.mutate({ flagId: row.flagId, userId: values.ownerId })
    }
    metadataMutation.mutate(
      { flagId: row.flagId, labels: presentLabels, req: toUpdateFlagRequest(values) },
      {
        onSuccess: () => {
          setIsEditing(false)
          toast.success(
            `Updated "${row.flagId}" in ${presentLabels.length} environment${presentLabels.length === 1 ? '' : 's'}`,
          )
        },
      },
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <section className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{flagName}</h2>
          <p className="text-sm text-muted-foreground font-mono">{row.flagId}</p>
          {!isEditing && row.description && <p className="text-sm mt-2">{row.description}</p>}
        </div>
        {!isEditing && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              disabled={!canEditAll}
              title={editBlockedReason ?? 'Edit name, description, owner and retire-by date'}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setIsDeleting(true)}
              disabled={!canEditAll}
              title={
                editBlockedReason ?? 'Permanently delete this flag from every environment'
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        )}
      </section>

      {!isEditing && blockedNotice && (
        <div
          role="note"
          className="flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          {blockedNotice.icon === 'lock' ? (
            <Lock className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          ) : (
            <Shield className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          )}
          <span>
            <strong className="font-medium">{blockedNotice.title}</strong>{' '}
            {blockedNotice.body}
          </span>
        </div>
      )}

      {isEditing ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(saveDetails)} className="space-y-4 rounded-lg border p-4">
            <FlagDetailsFields
              assignableUsers={assignableUsers}
              idPrefix="flag-detail"
              namePlaceholder={row.flagId}
              ownerHint={`Applies to all ${presentLabels.length} environment${presentLabels.length === 1 ? '' : 's'} holding this flag.`}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={metadataMutation.isPending}>
                {metadataMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-lg border p-4">
          <Fact label="Owner">
            {row.ownerIsDeleted ? (
              <span className="text-rose">Deleted user</span>
            ) : (
              row.ownerEmail ?? <span className="text-muted-foreground">Unassigned</span>
            )}
          </Fact>
          <Fact label="Retire by">
            {permanent ? 'Never' : retireBy ? safeDate(retireBy) : '--'}
          </Fact>
          <Fact label="Environments">
            {row.copies.length} of {environments.length}
          </Fact>
          <Fact label="Locked">
            {lockedIn.length === 0 ? (
              <span className="text-muted-foreground">No</span>
            ) : (
              <span className="inline-flex flex-wrap gap-1">
                {lockedIn.map((e) => (
                  <Badge key={e.id} variant="outline" className="text-xs">
                    {e.name}
                  </Badge>
                ))}
              </span>
            )}
          </Fact>
        </dl>
      )}

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Rollout</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Turn this flag on or off per environment, or add it where it is missing. Each
            environment is written and audited separately.
          </p>
        </div>

        <FlagEnvironmentRows
          flagName={flagName}
          copies={row.copies}
          environments={environments}
          isAdmin={isAdmin}
          desired={desired}
          update={update}
          canLock={canLock}
        />

        {addCount > 0 && <CreateCopyNote />}

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            {changeSummary({ addCount, toggleCount, lockCount, unlockCount })}
          </span>
          <Button
            type="button"
            disabled={changes.length === 0 || applyMutation.isPending || !template}
            onClick={apply}
          >
            {applyMutation.isPending ? 'Applying...' : 'Apply changes'}
          </Button>
        </div>
      </section>

      <AlertDialog open={isDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete flag permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{flagName}</strong> will be deleted from Azure App Configuration in{' '}
              {presentLabels.length === 1
                ? 'its one environment'
                : `all ${presentLabels.length} environments that have it`}
              . This cannot be undone, and any application still reading this flag will fall
              back to its own default. Its audit history in Flagsweep is kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleting(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteMutation.mutate(
                  { flagId: row.flagId, labels: presentLabels },
                  {
                    onSuccess: () => {
                      setIsDeleting(false)
                      toast.success(`Deleted "${row.flagId}"`)
                      navigate(`/connections/${connectionId}/flags`)
                    },
                    onError: () => setIsDeleting(false),
                  },
                )
              }
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
