import { describe, expect, it } from 'vitest'
import { compareWithBaseline, flagPath } from './dashboardData'
import { DEV, PIPELINE, connection, flag } from '@/test/builders'
import type { FeatureFlag } from '@/types/flag'

/** Keyed the way the dashboard keys it: `${connectionId}-${environmentKey}`. */
function flagsByEnv(byLabel: Record<string, FeatureFlag[]>) {
  return new Map(Object.entries(byLabel).map(([label, flags]) => [`1-${label}`, flags]))
}
const on = (id: string, label: string) => flag({ id, label, isEnabled: true })
const off = (id: string, label: string) => flag({ id, label, isEnabled: false })

describe('compareWithBaseline', () => {
  it('compares against the last environment and reports which ones differ', () => {
    const { baseline, driftedFlags } = compareWithBaseline(
      connection(PIPELINE),
      flagsByEnv({ dev: [on('a', 'dev')], staging: [off('a', 'staging')], prod: [off('a', 'prod')] }),
    )
    expect(baseline.name).toBe('prod')
    expect(driftedFlags).toEqual([{ flagId: 'a', displayName: null, envNames: ['dev'] }])
  })

  it('counts a flag once however many environments disagree, so the total cannot exceed the flag count', () => {
    const { driftedFlags } = compareWithBaseline(
      connection(PIPELINE),
      flagsByEnv({ dev: [on('a', 'dev')], staging: [on('a', 'staging')], prod: [off('a', 'prod')] }),
    )
    expect(driftedFlags).toHaveLength(1)
    expect(driftedFlags[0].envNames).toEqual(['dev', 'staging'])
  })

  it('does not count a flag that is simply missing from an environment', () => {
    const { driftedFlags } = compareWithBaseline(
      connection(PIPELINE),
      flagsByEnv({ dev: [], staging: [off('a', 'staging')], prod: [off('a', 'prod')] }),
    )
    expect(driftedFlags).toEqual([])
  })

  it('does not count a flag the baseline does not have', () => {
    const { driftedFlags } = compareWithBaseline(
      connection(PIPELINE),
      flagsByEnv({ dev: [on('new', 'dev')], staging: [], prod: [] }),
    )
    expect(driftedFlags).toEqual([])
  })

  it('puts the most-drifted flags first, then by id, so the card’s cut-off keeps the worst', () => {
    const { driftedFlags } = compareWithBaseline(
      connection(PIPELINE),
      flagsByEnv({
        dev: [on('b', 'dev'), on('c', 'dev'), on('a', 'dev')],
        staging: [off('b', 'staging'), on('c', 'staging'), off('a', 'staging')],
        prod: [off('b', 'prod'), off('c', 'prod'), off('a', 'prod')],
      }),
    )
    expect(driftedFlags.map((f) => f.flagId)).toEqual(['c', 'a', 'b'])
  })

  it('has nothing to compare in a single-environment connection', () => {
    const { driftedFlags } = compareWithBaseline(connection([DEV]), flagsByEnv({ dev: [on('a', 'dev')] }))
    expect(driftedFlags).toEqual([])
  })
})

describe('flagPath', () => {
  it('escapes ids so a dotted or slashed flag id stays one path segment', () => {
    expect(flagPath(7, 'App/Dark.Mode')).toBe('/connections/7/flags/App%2FDark.Mode')
  })
})
