import { useEffect, useState } from 'react'
import type { EnvFlagChange } from '@/hooks/useFlagMutations'
import type { FeatureFlag } from '@/types/flag'
import type { ConnectionEnvironment } from '@/types/connection'

/** Labels are compared loosely: the no-label environment reads as null or ''. */
function sameLabel(a: string | null | undefined, b: string | null | undefined) {
  return (a ?? '') === (b ?? '')
}

export function copyForEnvironment(
  copies: FeatureFlag[],
  env: ConnectionEnvironment,
): FeatureFlag | null {
  return copies.find((c) => sameLabel(c.label, env.environmentKey)) ?? null
}

/** What the user has asked this environment to look like once they apply. */
export interface DesiredState {
  /** The flag is missing here and marked to be created. */
  adding: boolean
  enabled: boolean
  locked: boolean
}

/**
 * Why an environment's controls are frozen, or null when it is editable.
 * Protection is checked first so a member sees the reason they can act on.
 *
 * `lockedNow` is the lock as the user currently intends it, not as the store
 * holds it: staging an unlock frees the value controls in the same pass,
 * because the apply releases the lock before writing.
 */
export function frozenReason(
  env: ConnectionEnvironment,
  isAdmin: boolean,
  lockedNow: boolean,
): string | null {
  if (env.isProtected && !isAdmin) return 'Protected — admins only'
  if (lockedNow) return 'Locked in the store'
  return null
}

/**
 * The writes a set of pending edits implies, and how many of each kind. Pure so
 * the rules about protection and locks can be tested without rendering anything.
 */
export function planEnvironmentChanges({
  copies,
  environments,
  desired,
  isAdmin,
}: {
  copies: FeatureFlag[]
  environments: ConnectionEnvironment[]
  desired: Record<number, DesiredState>
  isAdmin: boolean
}) {
  const changes = environments.flatMap<EnvFlagChange>((env) => {
    const flag = copyForEnvironment(copies, env)
    const want = desired[env.id]
    if (!want) return []
    // Protection still blocks everything, but a lock the user has staged away
    // must not block the very change that releases it.
    if (env.isProtected && !isAdmin) return []

    if (flag === null) {
      return want.adding
        ? [{ label: env.environmentKey, create: true, enabled: want.enabled }]
        : []
    }

    const lockChanged = want.locked !== flag.isLocked
    const valueChanged = want.enabled !== flag.isEnabled
    // A held lock the user is keeping blocks a value change; releasing it in the
    // same pass does not, because the unlock is written first.
    const blockedByLock = flag.isLocked && want.locked
    if (!lockChanged && (!valueChanged || blockedByLock)) return []

    return [
      {
        label: env.environmentKey,
        create: false,
        enabled: blockedByLock ? flag.isEnabled : want.enabled,
        setLocked: lockChanged ? want.locked : undefined,
      },
    ]
  })

  // Counted per intent rather than per change, because one environment can both
  // release a lock and flip the value in a single apply.
  const addCount = changes.filter((c) => c.create).length
  const lockCount = changes.filter((c) => c.setLocked === true).length
  const unlockCount = changes.filter((c) => c.setLocked === false).length
  const toggleCount = environments.filter((env) => {
    const flag = copyForEnvironment(copies, env)
    const want = desired[env.id]
    if (!want || flag === null) return false
    if (env.isProtected && !isAdmin) return false
    if (flag.isLocked && want.locked) return false
    return want.enabled !== flag.isEnabled
  }).length

  return { changes, addCount, lockCount, unlockCount, toggleCount }
}

/**
 * Holds the pending per-environment edits for one flag and derives the work
 * they imply. Seeded once per flag rather than per render: `copies` is rebuilt
 * on every background refetch, and re-seeding on those would wipe pending edits.
 */
export function useFlagEnvironmentEdits({
  flagId,
  copies,
  environments,
  isAdmin,
}: {
  flagId: string | null
  copies: FeatureFlag[]
  environments: ConnectionEnvironment[]
  isAdmin: boolean
}) {
  const [desired, setDesired] = useState<Record<number, DesiredState>>({})

  useEffect(() => {
    if (flagId === null) return
    const seeded: Record<number, DesiredState> = {}
    for (const env of environments) {
      const flag = copyForEnvironment(copies, env)
      seeded[env.id] = {
        adding: false,
        enabled: flag?.isEnabled ?? false,
        locked: flag?.isLocked ?? false,
      }
    }
    setDesired(seeded)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flagId])

  function update(envId: number, patch: Partial<DesiredState>) {
    setDesired((prev) => ({ ...prev, [envId]: { ...prev[envId], ...patch } }))
  }

  const plan = planEnvironmentChanges({ copies, environments, desired, isAdmin })

  return {
    desired,
    update,
    ...plan,
    /** Any existing copy can seed a new one: metadata is the same everywhere. */
    template: copies[0] ?? null,
  }
}

/** Plain-language summary of the queued work, for a footer or toolbar. */
export function changeSummary(counts: {
  addCount: number
  toggleCount: number
  lockCount?: number
  unlockCount?: number
}): string {
  const { addCount, toggleCount, lockCount = 0, unlockCount = 0 } = counts
  if (addCount + toggleCount + lockCount + unlockCount === 0) return 'No changes'
  return [
    addCount > 0 && `${addCount} to add`,
    toggleCount > 0 && `${toggleCount} to toggle`,
    unlockCount > 0 && `${unlockCount} to unlock`,
    lockCount > 0 && `${lockCount} to lock`,
  ]
    .filter(Boolean)
    .join(', ')
}

/** "on in 2 of 3" — the rollout in words, for screen readers and dense rows. */
export function rolloutSummary(
  copies: FeatureFlag[],
  environments: ConnectionEnvironment[],
): string {
  const present = environments.filter((e) => copyForEnvironment(copies, e) !== null)
  if (present.length === 0) return 'not set anywhere'
  const on = present.filter((e) => copyForEnvironment(copies, e)?.isEnabled)
  return `on in ${on.length} of ${environments.length}`
}
