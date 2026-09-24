import type { FlagsweepWorld } from './world.js'

export function flagRow(world: FlagsweepWorld, flagName: string) {
  return world.page.locator('table tbody tr', { hasText: flagName })
}
