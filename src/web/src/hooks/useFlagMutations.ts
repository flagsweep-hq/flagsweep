import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFlag, updateFlag, deleteFlag, setFlagLock, setFlagOwner } from '@/api/flagsApi'
import type { CreateFlagRequest, FeatureFlag, UpdateFlagRequest } from '@/types/flag'

export function useToggleFlag(connectionId: number, label: string | null) {
  const queryClient = useQueryClient()
  const queryKey = ['flags', connectionId, label]

  return useMutation({
    mutationFn: (flag: FeatureFlag) =>
      updateFlag(connectionId, flag.id, label, { enabled: !flag.isEnabled }),

    onMutate: async (flag) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<FeatureFlag[]>(queryKey)

      queryClient.setQueryData<FeatureFlag[]>(queryKey, (old) =>
        old?.map(f => f.id === flag.id
          ? { ...f, isEnabled: !f.isEnabled, deployStatus: 'deploying' }
          : f
        ) ?? []
      )

      return { previous }
    },

    onSuccess: (serverFlag) => {
      queryClient.setQueryData<FeatureFlag[]>(queryKey, (old) =>
        old?.map(f => f.id === serverFlag.id ? { ...serverFlag, deployStatus: 'deploying' } : f) ?? []
      )
      setTimeout(() => {
        queryClient.setQueryData<FeatureFlag[]>(queryKey, (old) =>
          old?.map(f => f.id === serverFlag.id ? { ...f, deployStatus: null } : f) ?? []
        )
      }, 1500)
    },

    onError: (_err, _flag, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
  })
}

export function useCreateFlag(connectionId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (req: CreateFlagRequest) => createFlag(connectionId, req),
    onSuccess: () => {
      // A flag can be created in several environments at once, so refresh every
      // environment's list rather than just the one currently on screen.
      queryClient.invalidateQueries({ queryKey: ['flags', connectionId] })
    },
  })
}

export function useUpdateFlagDetails(connectionId: number, label: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: UpdateFlagRequest }) =>
      updateFlag(connectionId, id, label, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flags', connectionId, label] })
    },
  })
}

export function useSetFlagLock(connectionId: number, label: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ flag, locked }: { flag: FeatureFlag; locked: boolean }) =>
      setFlagLock(connectionId, flag.id, label, locked),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flags', connectionId, label] })
    },
  })
}

export function useSetFlagOwner(connectionId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ flagId, userId }: { flagId: string; userId: string | null }) =>
      setFlagOwner(connectionId, flagId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flags', connectionId] })
    },
  })
}

export function useDeleteFlag(connectionId: number, label: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (flagId: string) => deleteFlag(connectionId, flagId, label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flags', connectionId, label] })
    },
  })
}

/**
 * A single environment's worth of queued work: either the flag is missing there
 * and has to be created, or it exists and its enabled state is being flipped.
 */
export interface EnvFlagChange {
  label: string | null
  create: boolean
  enabled: boolean
  /** Leave undefined to keep the lock as the store holds it. */
  setLocked?: boolean
}

export interface ApplyEnvironmentChangesInput {
  flagId: string
  /** Metadata copied onto newly created copies so every environment matches. */
  template: FeatureFlag
  changes: EnvFlagChange[]
}

/**
 * Applies queued per-environment changes for one flag. Each environment is written on its own call so every
 * change lands in the audit trail attributed to its own environment; they run in
 * sequence so a rejection (protected environment, locked flag) stops the rest
 * instead of racing them through.
 */
export function useApplyEnvironmentChanges(connectionId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ flagId, template, changes }: ApplyEnvironmentChangesInput) => {
      // Locks are released first and applied last, with the value writes in
      // between. A store lock refuses writes, so unlocking and changing a flag
      // in one pass only works in that order -- and a flag being locked must
      // still accept the change that precedes the lock.
      for (const change of changes.filter((c) => c.setLocked === false)) {
        await setFlagLock(connectionId, flagId, change.label, false)
      }

      for (const change of changes) {
        if (change.create) {
          await createFlag(connectionId, {
            id: flagId,
            labels: [change.label],
            displayName: template.displayName,
            description: template.description,
            isPermanent: template.isPermanent,
            expiresAt: template.expiresAt,
            // Ownership is connection-wide and already set, so leave it alone.
            ownerId: null,
          })
        }
        // Flags are always born disabled, so enabling a freshly created copy is a
        // second, separately audited change rather than part of the create.
        if (!change.create || change.enabled) {
          await updateFlag(connectionId, flagId, change.label, { enabled: change.enabled })
        }
      }

      for (const change of changes.filter((c) => c.setLocked === true)) {
        await setFlagLock(connectionId, flagId, change.label, true)
      }
    },
    // Invalidate on failure too: the environments processed before the error did
    // change, and the table must not keep showing their old state.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['flags', connectionId] })
    },
  })
}

/**
 * Name, description, permanence and retire-by live on each copy in the store but
 * belong to the flag, so an edit from a flag-first view is written to every
 * environment that has a copy. Sequential, so a refusal stops the rest rather
 * than leaving some copies renamed and others not.
 */
export function useUpdateFlagEverywhere(connectionId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      flagId,
      labels,
      req,
    }: {
      flagId: string
      labels: (string | null)[]
      req: UpdateFlagRequest
    }) => {
      for (const label of labels) {
        await updateFlag(connectionId, flagId, label, req)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['flags', connectionId] })
    },
  })
}

/**
 * Deleting retires the whole feature, so every copy goes. The provider removes
 * the setting outright -- there is no tombstone and no recycle bin -- so this is
 * irreversible. Sequential for the same reason as the others: a refusal should
 * stop the run, not scatter it.
 */
export function useDeleteFlagEverywhere(connectionId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ flagId, labels }: { flagId: string; labels: (string | null)[] }) => {
      for (const label of labels) {
        await deleteFlag(connectionId, flagId, label)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['flags', connectionId] })
    },
  })
}
