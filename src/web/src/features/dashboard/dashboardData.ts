import type { Connection, ConnectionEnvironment } from '@/types/connection'
import type { FeatureFlag } from '@/types/flag'

export interface EnvFlags {
  connection: Connection
  env: ConnectionEnvironment
  flags: FeatureFlag[]
}

/**
 * A flag's own page. Every flag named on this dashboard links here rather than
 * to an environment's table: the dashboard talks about flags, so a click should
 * land on the flag, not on a list you then have to find it in.
 */
export function flagPath(connectionId: number, flagId: string) {
  return `/connections/${connectionId}/flags/${encodeURIComponent(flagId)}`
}

export interface DriftedFlag {
  flagId: string
  displayName: string | null
  /** Environments whose value disagrees with the baseline's. */
  envNames: string[]
}

/**
 * The flags that have drifted apart between a connection's environments, compared
 * against its last environment — the baseline. Distinct from the Out of sync
 * badge, which means the store was written to outside Flagsweep.
 *
 * Reported per flag rather than per environment pair: the question on the
 * dashboard is which features disagree, and chaining adjacent pairs counted a
 * single flag once per pair it appeared in, so a connection's total could exceed
 * its flag count. A flag simply missing from an environment is a rollout in
 * progress, not a disagreement, so it is not drift.
 */
export function compareWithBaseline(connection: Connection, envFlagsMap: Map<string, FeatureFlag[]>) {
  const sorted = [...connection.environments].sort((a, b) => a.sortOrder - b.sortOrder)
  const baseline = sorted[sorted.length - 1]
  const byFlag = new Map<string, DriftedFlag>()

  if (sorted.length < 2) return { baseline, driftedFlags: [] as DriftedFlag[] }

  const baseFlags = envFlagsMap.get(`${connection.id}-${baseline.environmentKey}`) ?? []
  const baseMap = new Map(baseFlags.map((f) => [f.id, f]))

  for (const env of sorted.slice(0, -1)) {
    const flags = envFlagsMap.get(`${connection.id}-${env.environmentKey}`) ?? []
    const map = new Map(flags.map((f) => [f.id, f]))

    for (const [id, base] of baseMap) {
      const here = map.get(id)
      if (!here || here.isEnabled === base.isEnabled) continue

      const entry = byFlag.get(id)
      if (entry) entry.envNames.push(env.name)
      else
        byFlag.set(id, {
          flagId: id,
          displayName: here.displayName ?? base.displayName,
          envNames: [env.name],
        })
    }
  }

  // Most-drifted first, so the worst offenders survive the card's cut-off.
  const driftedFlags = [...byFlag.values()].sort(
    (a, b) => b.envNames.length - a.envNames.length || a.flagId.localeCompare(b.flagId),
  )
  return { baseline, driftedFlags }
}
