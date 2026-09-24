import { describe, expect, it } from 'vitest'
import {
  changeSummary,
  copyForEnvironment,
  frozenReason,
  planEnvironmentChanges,
  rolloutSummary,
  type DesiredState,
} from './flagEnvironmentEdits'
import { DEV, PIPELINE, PROD, env, flag } from '@/test/builders'

const PROTECTED_PROD = env(3, 'prod', { isProtected: true })
const want = (state: Partial<DesiredState>): DesiredState => ({
  adding: false,
  enabled: false,
  locked: false,
  ...state,
})

describe('copyForEnvironment', () => {
  it('finds the copy whose label is the environment key', () => {
    const prodCopy = flag({ label: 'prod' })
    expect(copyForEnvironment([flag({ label: 'dev' }), prodCopy], PROD)).toBe(prodCopy)
  })

  it('treats null and empty string as the same no-label environment', () => {
    const copy = flag({ label: '' })
    expect(copyForEnvironment([copy], env(1, null))).toBe(copy)
  })

  it('is null where the flag does not exist', () => {
    expect(copyForEnvironment([flag({ label: 'dev' })], PROD)).toBeNull()
  })
})

describe('frozenReason', () => {
  it('leaves an ordinary environment editable', () => {
    expect(frozenReason(DEV, false, false)).toBeNull()
  })

  it('freezes a protected environment for members but not admins', () => {
    expect(frozenReason(PROTECTED_PROD, false, false)).toBe('Protected — admins only')
    expect(frozenReason(PROTECTED_PROD, true, false)).toBeNull()
  })

  it('gives protection as the reason before the lock, since that is what a member can act on', () => {
    expect(frozenReason(PROTECTED_PROD, false, true)).toBe('Protected — admins only')
  })

  it('freezes a locked flag even for admins', () => {
    expect(frozenReason(DEV, true, true)).toBe('Locked in the store')
  })
})

describe('planEnvironmentChanges', () => {
  it('plans nothing when the wanted state already holds', () => {
    const plan = planEnvironmentChanges({
      copies: [flag({ label: 'dev', isEnabled: true })],
      environments: [DEV],
      desired: { [DEV.id]: want({ enabled: true }) },
      isAdmin: true,
    })
    expect(plan).toEqual({ changes: [], addCount: 0, lockCount: 0, unlockCount: 0, toggleCount: 0 })
  })

  it('plans a toggle', () => {
    const plan = planEnvironmentChanges({
      copies: [flag({ label: 'dev', isEnabled: false })],
      environments: [DEV],
      desired: { [DEV.id]: want({ enabled: true }) },
      isAdmin: false,
    })
    expect(plan.changes).toEqual([{ label: 'dev', create: false, enabled: true, setLocked: undefined }])
    expect(plan.toggleCount).toBe(1)
  })

  it('creates the flag only where the user asked for it', () => {
    const plan = planEnvironmentChanges({
      copies: [flag({ label: 'dev' })],
      environments: PIPELINE,
      desired: {
        [DEV.id]: want({}),
        2: want({ adding: true, enabled: true }),
        [PROD.id]: want({ adding: false, enabled: true }),
      },
      isAdmin: true,
    })
    expect(plan.changes).toEqual([{ label: 'staging', create: true, enabled: true }])
    expect(plan.addCount).toBe(1)
    expect(plan.toggleCount).toBe(0)
  })

  it('never writes to a protected environment on a member’s behalf', () => {
    const args = {
      copies: [flag({ label: 'prod', isEnabled: false })],
      environments: [PROTECTED_PROD],
      desired: { [PROTECTED_PROD.id]: want({ enabled: true, locked: true }) },
    }
    expect(planEnvironmentChanges({ ...args, isAdmin: false }).changes).toEqual([])
    expect(planEnvironmentChanges({ ...args, isAdmin: false }).toggleCount).toBe(0)
    expect(planEnvironmentChanges({ ...args, isAdmin: true }).changes).toHaveLength(1)
  })

  it('does not flip a value under a lock the user is keeping', () => {
    const plan = planEnvironmentChanges({
      copies: [flag({ label: 'dev', isEnabled: false, isLocked: true })],
      environments: [DEV],
      desired: { [DEV.id]: want({ enabled: true, locked: true }) },
      isAdmin: true,
    })
    expect(plan.changes).toEqual([])
    expect(plan.toggleCount).toBe(0)
  })

  it('releases a lock and flips the value in one change, counted as both', () => {
    const plan = planEnvironmentChanges({
      copies: [flag({ label: 'dev', isEnabled: false, isLocked: true })],
      environments: [DEV],
      desired: { [DEV.id]: want({ enabled: true, locked: false }) },
      isAdmin: true,
    })
    expect(plan.changes).toEqual([{ label: 'dev', create: false, enabled: true, setLocked: false }])
    expect(plan.unlockCount).toBe(1)
    expect(plan.toggleCount).toBe(1)
  })

  it('takes a new lock without touching the value', () => {
    const plan = planEnvironmentChanges({
      copies: [flag({ label: 'dev', isEnabled: true })],
      environments: [DEV],
      desired: { [DEV.id]: want({ enabled: true, locked: true }) },
      isAdmin: true,
    })
    expect(plan.changes).toEqual([{ label: 'dev', create: false, enabled: true, setLocked: true }])
    expect(plan.lockCount).toBe(1)
    expect(plan.toggleCount).toBe(0)
  })

  it('ignores environments it has no wanted state for yet', () => {
    const plan = planEnvironmentChanges({
      copies: [flag({ label: 'dev' })],
      environments: [DEV],
      desired: {},
      isAdmin: true,
    })
    expect(plan.changes).toEqual([])
  })
})

describe('changeSummary', () => {
  it('says so when there is nothing to do', () => {
    expect(changeSummary({ addCount: 0, toggleCount: 0 })).toBe('No changes')
  })

  it('lists each kind of work, unlocks before locks', () => {
    expect(changeSummary({ addCount: 1, toggleCount: 2, lockCount: 3, unlockCount: 4 })).toBe(
      '1 to add, 2 to toggle, 4 to unlock, 3 to lock',
    )
  })

  it('leaves out the kinds with nothing queued', () => {
    expect(changeSummary({ addCount: 0, toggleCount: 2 })).toBe('2 to toggle')
  })
})

describe('rolloutSummary', () => {
  it('counts environments that are on against all environments, not only where it exists', () => {
    const copies = [flag({ label: 'dev', isEnabled: true }), flag({ label: 'prod', isEnabled: false })]
    expect(rolloutSummary(copies, PIPELINE)).toBe('on in 1 of 3')
  })

  it('says when the flag is not set anywhere', () => {
    expect(rolloutSummary([], PIPELINE)).toBe('not set anywhere')
  })
})
