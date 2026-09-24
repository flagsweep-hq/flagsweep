import { describe, expect, it } from 'vitest'
import {
  RETIREMENT_WARNING_DAYS,
  baselineEnvironment,
  flagCopyStatuses,
  flagStatuses,
  retirement,
} from './flagStatuses'
import { DEV, PIPELINE, PROD, STAGING, env, flag, row } from '@/test/builders'

const NOW = Date.parse('2026-06-15T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000
const daysFromNow = (days: number) => new Date(NOW + days * DAY).toISOString()
const keys = (statuses: { key: string }[]) => statuses.map((s) => s.key)

describe('baselineEnvironment', () => {
  it('is the last environment by sort order, whatever order they arrive in', () => {
    expect(baselineEnvironment([PROD, DEV, STAGING])).toBe(PROD)
  })

  it('is null when there is nothing to compare against', () => {
    expect(baselineEnvironment([])).toBeNull()
    expect(baselineEnvironment([DEV])).toBeNull()
  })
})

describe('retirement', () => {
  it('treats the flag as permanent if any copy is', () => {
    const copies = [flag({ label: 'dev' }), flag({ label: 'prod', isPermanent: true })]
    expect(retirement({ copies }).permanent).toBe(true)
  })

  it('takes the retire-by date from the first copy that has one', () => {
    const copies = [flag({ label: 'dev' }), flag({ label: 'prod', expiresAt: daysFromNow(5) })]
    expect(retirement({ copies }).expiresAt).toBe(daysFromNow(5))
  })

  it('has no date when no copy has one', () => {
    expect(retirement({ copies: [flag()] })).toEqual({ permanent: false, expiresAt: null })
  })
})

describe('flagStatuses — drift', () => {
  it('flags an environment switched differently from the baseline, and names the baseline', () => {
    const statuses = flagStatuses(
      row([flag({ label: 'dev', isEnabled: true }), flag({ label: 'prod', isEnabled: false })]),
      PIPELINE,
      NOW,
    )
    expect(keys(statuses)).toEqual(['drift'])
    expect(statuses[0].title).toBe('Switched differently from prod')
  })

  it('is not drift when every environment agrees', () => {
    const copies = PIPELINE.map((e) => flag({ label: e.environmentKey, isEnabled: true }))
    expect(flagStatuses(row(copies), PIPELINE, NOW)).toEqual([])
  })

  it('is not drift when the flag is missing from the baseline — that is a rollout in progress', () => {
    const copies = [flag({ label: 'dev', isEnabled: true }), flag({ label: 'staging', isEnabled: false })]
    expect(flagStatuses(row(copies), PIPELINE, NOW)).toEqual([])
  })

  it('is not drift when the flag exists only in the baseline', () => {
    expect(flagStatuses(row([flag({ label: 'prod', isEnabled: true })]), PIPELINE, NOW)).toEqual([])
  })

  it('cannot drift in a connection with a single environment', () => {
    expect(flagStatuses(row([flag({ label: 'dev', isEnabled: true })]), [DEV], NOW)).toEqual([])
  })

  it('matches the no-label environment whether the copy says null or empty string', () => {
    const unlabelled = env(1, null)
    const copies = [flag({ label: '', isEnabled: true }), flag({ label: 'prod', isEnabled: false })]
    expect(keys(flagStatuses(row(copies), [unlabelled, PROD], NOW))).toEqual(['drift'])
  })
})

describe('flagStatuses — retirement', () => {
  const withExpiry = (expiresAt: string, extra = {}) => row([flag({ expiresAt, ...extra })])

  it('is overdue once the date has passed', () => {
    expect(keys(flagStatuses(withExpiry(daysFromNow(-1)), [DEV], NOW))).toEqual(['overdue'])
  })

  it('is retiring soon up to and including the warning window', () => {
    expect(keys(flagStatuses(withExpiry(daysFromNow(1)), [DEV], NOW))).toEqual(['retiring-soon'])
    expect(keys(flagStatuses(withExpiry(daysFromNow(RETIREMENT_WARNING_DAYS)), [DEV], NOW))).toEqual([
      'retiring-soon',
    ])
  })

  it('says nothing beyond the warning window', () => {
    expect(flagStatuses(withExpiry(daysFromNow(RETIREMENT_WARNING_DAYS + 1)), [DEV], NOW)).toEqual([])
  })

  it('never nags about a permanent flag, even with a past date', () => {
    expect(flagStatuses(withExpiry(daysFromNow(-30), { isPermanent: true }), [DEV], NOW)).toEqual([])
  })

  it('survives an unparseable date rather than crashing the table', () => {
    expect(() => flagStatuses(withExpiry('not-a-date'), [DEV], NOW)).not.toThrow()
  })
})

describe('flagStatuses — locks, outside changes and owners', () => {
  it('names the environments a flag is locked in', () => {
    const copies = [flag({ label: 'dev', isLocked: true }), flag({ label: 'prod', isLocked: true })]
    const [locked] = flagStatuses(row(copies), [DEV, PROD], NOW)
    expect(locked.key).toBe('locked')
    expect(locked.title).toBe('Locked in dev, prod — unlock to modify')
  })

  it('reports a store changed behind Flagsweep’s back, and where', () => {
    const copies = [flag({ label: 'dev', modifiedExternally: true }), flag({ label: 'prod' })]
    const [outOfSync] = flagStatuses(row(copies), [DEV, PROD], NOW)
    expect(outOfSync.key).toBe('out-of-sync')
    expect(outOfSync.title).toContain('(dev)')
  })

  it('asks for reassignment when the owner was deleted', () => {
    const statuses = flagStatuses(
      row([flag()], { ownerEmail: 'gone@example.com', ownerIsDeleted: true }),
      [DEV],
      NOW,
    )
    expect(keys(statuses)).toEqual(['owner-deleted'])
    expect(statuses[0].title).toContain('gone@example.com')
  })

  it('lists every status a flag earns in the documented order', () => {
    const copies = [
      flag({ label: 'dev', isEnabled: true, isLocked: true, modifiedExternally: true, expiresAt: daysFromNow(-2) }),
      flag({ label: 'prod', isEnabled: false }),
    ]
    const statuses = flagStatuses(row(copies, { ownerIsDeleted: true }), [DEV, PROD], NOW)
    expect(keys(statuses)).toEqual(['out-of-sync', 'drift', 'locked', 'overdue', 'owner-deleted'])
  })
})

describe('flagCopyStatuses', () => {
  it('compares one copy with the same flag in the baseline', () => {
    const baseline = { name: 'prod', copy: flag({ label: 'prod', isEnabled: false }) }
    expect(keys(flagCopyStatuses(flag({ isEnabled: true }), baseline, NOW))).toEqual(['drift'])
    expect(flagCopyStatuses(flag({ isEnabled: false }), baseline, NOW)).toEqual([])
  })

  it('is not drift when the baseline lacks the flag, or when this table is the baseline', () => {
    expect(flagCopyStatuses(flag({ isEnabled: true }), { name: 'prod', copy: null }, NOW)).toEqual([])
    expect(flagCopyStatuses(flag({ isEnabled: true }), null, NOW)).toEqual([])
  })

  it('does not name the environment, because the table is already scoped to one', () => {
    const [locked] = flagCopyStatuses(flag({ isLocked: true }), null, NOW)
    expect(locked.title).toBe('Locked in the store — unlock to modify')
  })
})
