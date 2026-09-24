export interface FeatureFlag {
  id: string
  label: string | null
  isEnabled: boolean
  description: string | null
  displayName: string | null
  lastModified: string | null
  deployStatus: string | null
  isPermanent: boolean
  expiresAt: string | null
  modifiedExternally: boolean | null
  isLocked: boolean
  ownerId: string | null
  ownerEmail: string | null
  ownerIsDeleted: boolean
}

export interface CreateFlagRequest {
  id: string
  labels: (string | null)[]
  description: string | null
  displayName: string | null
  isPermanent: boolean
  expiresAt: string | null
  ownerId: string | null
}

export interface UpdateFlagRequest {
  enabled?: boolean
  displayName?: string | null
  description?: string | null
  isPermanent?: boolean
  expiresAt?: string | null
  clearExpiry?: boolean
}

/**
 * One flag as it exists across a whole connection. `copies` holds only the
 * environments where the flag actually exists, so a missing environment is
 * represented by absence rather than a placeholder.
 */
export interface FlagMatrixRow {
  flagId: string
  displayName: string | null
  description: string | null
  ownerId: string | null
  ownerEmail: string | null
  ownerIsDeleted: boolean
  copies: FeatureFlag[]
}
