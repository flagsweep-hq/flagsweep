import { describe, expect, it } from 'vitest'
import { flagDetailsDefaults, retireByIso, toUpdateFlagRequest, type FlagDetailsValues } from './flagDetailsForm'
import { flag } from '@/test/builders'

const values = (overrides: Partial<FlagDetailsValues> = {}): FlagDetailsValues => ({
  displayName: '',
  description: '',
  isPermanent: false,
  expiresAt: '',
  ownerId: null,
  ...overrides,
})

describe('flagDetailsDefaults', () => {
  it('starts an empty form for a new flag', () => {
    expect(flagDetailsDefaults(null)).toEqual(values())
  })

  it('cuts the stored timestamp down to the yyyy-mm-dd a date input accepts', () => {
    const defaults = flagDetailsDefaults(flag({ expiresAt: '2026-12-14T00:00:00+00:00', ownerId: 'u1' }))
    expect(defaults.expiresAt).toBe('2026-12-14')
    expect(defaults.ownerId).toBe('u1')
  })
})

describe('retireByIso', () => {
  it('pins the chosen day to UTC midnight, so it does not shift with the browser’s time zone', () => {
    expect(retireByIso({ isPermanent: false, expiresAt: '2026-12-14' })).toBe('2026-12-14T00:00:00.000Z')
  })

  it('is null without a date', () => {
    expect(retireByIso({ isPermanent: false, expiresAt: '' })).toBeNull()
  })

  it('is null for a permanent flag even if a date is still typed in', () => {
    expect(retireByIso({ isPermanent: true, expiresAt: '2026-12-14' })).toBeNull()
  })
})

describe('toUpdateFlagRequest', () => {
  it('trims text and sends blanks as null', () => {
    const request = toUpdateFlagRequest(values({ displayName: '  Checkout  ', description: '   ' }))
    expect(request.displayName).toBe('Checkout')
    expect(request.description).toBeNull()
  })

  it('sends the date and keeps it', () => {
    const request = toUpdateFlagRequest(values({ expiresAt: '2026-12-14' }))
    expect(request.expiresAt).toBe('2026-12-14T00:00:00.000Z')
    expect(request.clearExpiry).toBe(false)
  })

  it('clears the stored date when the field is emptied', () => {
    const request = toUpdateFlagRequest(values({ expiresAt: '' }))
    expect(request.expiresAt).toBeUndefined()
    expect(request.clearExpiry).toBe(true)
  })

  it('clears the stored date when the flag becomes permanent', () => {
    const request = toUpdateFlagRequest(values({ isPermanent: true, expiresAt: '2026-12-14' }))
    expect(request.isPermanent).toBe(true)
    expect(request.expiresAt).toBeUndefined()
    expect(request.clearExpiry).toBe(true)
  })
})
