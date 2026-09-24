import { formatDistanceToNow, parseISO } from 'date-fns'
import { ArrowLeftRight, Lock } from 'lucide-react'
import { copyForEnvironment } from './flagEnvironmentEdits'
import type { FeatureFlag, FlagMatrixRow } from '@/types/flag'
import type { ConnectionEnvironment } from '@/types/connection'

/** How far ahead of its retire-by date a flag starts asking for attention. */
export const RETIREMENT_WARNING_DAYS = 14

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Every status key, in the order badges and filter options should read. The
 * labels live here so the badge and the Status filter can never disagree.
 */
export const STATUS_LABELS = {
  /** The store was written to behind Flagsweep's back. */
  'out-of-sync': 'Out of sync',
  /** Environments have drifted apart from each other. */
  drift: 'Drift',
  locked: 'Locked',
  overdue: 'Overdue',
  'retiring-soon': 'Retiring soon',
  'owner-deleted': 'Owner deleted',
} as const

export type FlagStatusKey = keyof typeof STATUS_LABELS

export const STATUS_KEYS = Object.keys(STATUS_LABELS) as FlagStatusKey[]

export interface FlagStatus {
  /** Stable key, also the React list key and the Status filter's value. */
  key: FlagStatusKey
  label: string
  /** Badge colours — the palette already used elsewhere for this meaning. */
  className: string
  /** Hover text saying which environments, or how overdue. */
  title: string
  icon?: typeof Lock
}

/**
 * The environment every other one is compared against: the last in the connection's
 * order, normally production. Matches the dashboard's Environment Sync card, so
 * "out of sync" means the same thing in both places. Null when there is nothing
 * to compare against.
 */
export function baselineEnvironment(
  environments: ConnectionEnvironment[],
): ConnectionEnvironment | null {
  if (environments.length < 2) return null
  const sorted = [...environments].sort((a, b) => a.sortOrder - b.sortOrder)
  return sorted[sorted.length - 1]
}

/** Retirement is recorded per copy but is a property of the flag. */
export function retirement(row: { copies: FeatureFlag[] }) {
  return {
    permanent: row.copies.some((c) => c.isPermanent),
    expiresAt: row.copies.find((c) => c.expiresAt)?.expiresAt ?? null,
  }
}

function environmentList(copies: FeatureFlag[]): string {
  return copies.map((c) => c.label ?? 'no label').join(', ')
}

/** `formatDistanceToNow` throws on an unparseable stamp; a title is not worth a crash. */
function relative(stamp: string): string | null {
  try {
    return formatDistanceToNow(parseISO(stamp), { addSuffix: true })
  } catch {
    return null
  }
}

interface StatusSubject {
  copies: FeatureFlag[]
  ownerEmail: string | null
  ownerIsDeleted: boolean
  /**
   * Whether tooltips should name the environments involved. The flag list spans
   * a whole connection, so "Locked in dev, prod" is the useful phrasing; an
   * environment's own table is already scoped to one, where naming it is noise.
   */
  nameEnvironments: boolean
  /** Name of the baseline environment this flag disagrees with, if it does. */
  disagreesWith: string | null
}

/**
 * Every lifecycle label a flag currently earns, in the order they should read.
 * This is the one place the Status column is defined — for both the connection's
 * flag list and an environment's own table. Add a case here and the badge
 * appears in both, no column changes needed.
 */
function buildStatuses(subject: StatusSubject, now: number): FlagStatus[] {
  const statuses: FlagStatus[] = []
  const where = (copies: FeatureFlag[]) =>
    subject.nameEnvironments ? ` (${environmentList(copies)})` : ''

  const changedOutside = subject.copies.filter((c) => c.modifiedExternally)
  if (changedOutside.length > 0) {
    statuses.push({
      key: 'out-of-sync',
      label: STATUS_LABELS['out-of-sync'],
      className: 'bg-sky-subtle text-sky',
      title: `Changed in the cloud store since Flagsweep's last write${where(changedOutside)}`,
    })
  }

  if (subject.disagreesWith) {
    statuses.push({
      key: 'drift',
      label: STATUS_LABELS['drift'],
      icon: ArrowLeftRight,
      className: 'bg-amber-subtle text-amber',
      title: `Switched differently from ${subject.disagreesWith}`,
    })
  }

  const lockedIn = subject.copies.filter((c) => c.isLocked)
  if (lockedIn.length > 0) {
    statuses.push({
      key: 'locked',
      label: STATUS_LABELS['locked'],
      icon: Lock,
      className: 'bg-amber-subtle text-amber',
      title: subject.nameEnvironments
        ? `Locked in ${environmentList(lockedIn)} — unlock to modify`
        : 'Locked in the store — unlock to modify',
    })
  }

  const { permanent, expiresAt } = retirement(subject)
  if (!permanent && expiresAt) {
    const due = new Date(expiresAt).getTime()
    const when = relative(expiresAt)
    if (due < now) {
      statuses.push({
        key: 'overdue',
        label: STATUS_LABELS['overdue'],
        className: 'bg-rose-subtle text-rose',
        title: when ? `Retirement overdue — was due ${when}` : 'Retirement overdue',
      })
    } else if (due <= now + RETIREMENT_WARNING_DAYS * DAY_MS) {
      statuses.push({
        key: 'retiring-soon',
        label: STATUS_LABELS['retiring-soon'],
        className: 'bg-amber-subtle text-amber',
        title: when ? `Due to retire ${when}` : 'Due to retire shortly',
      })
    }
  }

  if (subject.ownerIsDeleted) {
    statuses.push({
      key: 'owner-deleted',
      label: STATUS_LABELS['owner-deleted'],
      className: 'bg-rose-subtle text-rose',
      title: `${subject.ownerEmail ?? 'The owner'} was deleted — reassign this flag`,
    })
  }

  return statuses
}

/** Statuses for a flag across every environment it exists in. */
export function flagStatuses(
  row: FlagMatrixRow,
  environments: ConnectionEnvironment[],
  now: number = Date.now(),
): FlagStatus[] {
  // A flag absent from the baseline, or from everywhere else, is a rollout in
  // progress rather than a disagreement — same rule the dashboard counts by.
  const baseline = baselineEnvironment(environments)
  const baseCopy = baseline ? copyForEnvironment(row.copies, baseline) : null
  const disagrees =
    baseline !== null &&
    baseCopy !== null &&
    environments.some((env) => {
      if (env.id === baseline.id) return false
      const here = copyForEnvironment(row.copies, env)
      return here !== null && here.isEnabled !== baseCopy.isEnabled
    })

  return buildStatuses(
    {
      copies: row.copies,
      ownerEmail: row.ownerEmail,
      ownerIsDeleted: row.ownerIsDeleted,
      nameEnvironments: true,
      disagreesWith: disagrees ? baseline!.name : null,
    },
    now,
  )
}

/**
 * Statuses for one environment's copy of a flag. `baseline` is the same flag as
 * it stands in the baseline environment; pass null when this environment *is*
 * the baseline, or when the connection has nothing to compare against.
 */
export function flagCopyStatuses(
  flag: FeatureFlag,
  baseline: { name: string; copy: FeatureFlag | null } | null = null,
  now: number = Date.now(),
): FlagStatus[] {
  const disagrees =
    baseline !== null && baseline.copy !== null && baseline.copy.isEnabled !== flag.isEnabled

  return buildStatuses(
    {
      copies: [flag],
      ownerEmail: flag.ownerEmail,
      ownerIsDeleted: flag.ownerIsDeleted,
      nameEnvironments: false,
      disagreesWith: disagrees ? baseline!.name : null,
    },
    now,
  )
}
