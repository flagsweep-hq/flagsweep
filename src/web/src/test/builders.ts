import type { FeatureFlag, FlagMatrixRow } from '@/types/flag'
import type { Connection, ConnectionEnvironment } from '@/types/connection'

/** Test data with boring defaults, so each test states only what it is about. */
export function flag(overrides: Partial<FeatureFlag> = {}): FeatureFlag {
  return {
    id: 'checkout',
    label: 'dev',
    isEnabled: false,
    description: null,
    displayName: null,
    lastModified: null,
    deployStatus: null,
    isPermanent: false,
    expiresAt: null,
    modifiedExternally: false,
    isLocked: false,
    ownerId: null,
    ownerEmail: null,
    ownerIsDeleted: false,
    ...overrides,
  }
}

export function env(
  id: number,
  environmentKey: string | null,
  overrides: Partial<ConnectionEnvironment> = {},
): ConnectionEnvironment {
  return { id, name: environmentKey ?? 'default', environmentKey, sortOrder: id, isProtected: false, ...overrides }
}

export function row(copies: FeatureFlag[], overrides: Partial<FlagMatrixRow> = {}): FlagMatrixRow {
  return {
    flagId: copies[0]?.id ?? 'checkout',
    displayName: null,
    description: null,
    ownerId: null,
    ownerEmail: null,
    ownerIsDeleted: false,
    copies,
    ...overrides,
  }
}

export function connection(environments: ConnectionEnvironment[]): Connection {
  return { id: 1, name: 'app', providerType: 'Azure', endpoint: 'https://app.azconfig.io', createdAt: '', environments }
}

/** dev → staging → prod, so prod is the baseline. */
export const DEV = env(1, 'dev')
export const STAGING = env(2, 'staging')
export const PROD = env(3, 'prod')
export const PIPELINE = [DEV, STAGING, PROD]
