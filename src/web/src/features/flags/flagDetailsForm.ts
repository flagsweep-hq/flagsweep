import { z } from 'zod'
import type { FeatureFlag, UpdateFlagRequest } from '@/types/flag'

/**
 * The fields that describe a flag rather than one environment's copy of it.
 * Shared by the create dialog, the per-environment table's edit dialog and the inline edit mode on
 * a flag's own page, so the two cannot drift apart.
 */
export const flagDetailsSchema = z.object({
  displayName: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  isPermanent: z.boolean(),
  expiresAt: z.string().optional(),
  ownerId: z.string().nullable(),
})

export type FlagDetailsValues = z.infer<typeof flagDetailsSchema>

export function flagDetailsDefaults(flag: FeatureFlag | null): FlagDetailsValues {
  return {
    displayName: flag?.displayName ?? '',
    description: flag?.description ?? '',
    isPermanent: flag?.isPermanent ?? false,
    // The date input wants a bare yyyy-mm-dd.
    expiresAt: flag?.expiresAt ? flag.expiresAt.slice(0, 10) : '',
    ownerId: flag?.ownerId ?? null,
  }
}

/** The retire-by date as the API wants it. A permanent flag has none, so one clears the other. */
export function retireByIso(values: Pick<FlagDetailsValues, 'isPermanent' | 'expiresAt'>): string | null {
  if (values.isPermanent || !values.expiresAt) return null
  // The date input gives a bare yyyy-mm-dd; pin it to UTC midnight.
  return new Date(values.expiresAt + 'T00:00:00Z').toISOString()
}

export function toUpdateFlagRequest(values: FlagDetailsValues): UpdateFlagRequest {
  const expiresAt = retireByIso(values)
  return {
    displayName: values.displayName?.trim() || null,
    description: values.description?.trim() || null,
    isPermanent: values.isPermanent,
    expiresAt: expiresAt ?? undefined,
    clearExpiry: expiresAt === null,
  }
}
