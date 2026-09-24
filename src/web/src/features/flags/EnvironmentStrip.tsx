import { Shield } from 'lucide-react'
import { copyForEnvironment } from './flagEnvironmentEdits'
import type { FeatureFlag } from '@/types/flag'
import type { ConnectionEnvironment } from '@/types/connection'

/** Why this environment's chip cannot be toggled, or null when it can. */
function notToggleableBecause(
  env: ConnectionEnvironment,
  flag: FeatureFlag | null,
  isAdmin: boolean,
): string | null {
  if (flag === null) return 'not set here'
  if (env.isProtected && !isAdmin) return 'protected — admins only'
  if (flag.isLocked) return 'locked in the store'
  return null
}

/**
 * One flag's state across every environment, as a row of compact chips. This is
 * the core flag-first affordance: the whole rollout of a feature readable at a
 * glance, in the connection's own environment order — and, where the caller allows
 * it, a chip is the one-click way to flip that environment.
 */
export function EnvironmentStrip({
  flagName,
  copies,
  environments,
  isAdmin = false,
  onToggle,
}: {
  flagName: string
  copies: FeatureFlag[]
  environments: ConnectionEnvironment[]
  isAdmin?: boolean
  /** Omit to render the strip read-only. */
  onToggle?: (env: ConnectionEnvironment, flag: FeatureFlag) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {environments.map((env) => {
        const flag = copyForEnvironment(copies, env)
        const state = flag === null ? 'missing' : flag.isEnabled ? 'on' : 'off'
        const blocked = notToggleableBecause(env, flag, isAdmin)
        const interactive = !!onToggle && blocked === null && flag !== null

        const tone =
          state === 'on'
            ? 'bg-emerald-subtle text-emerald'
            : state === 'off'
              ? 'bg-muted text-muted-foreground'
              : 'border border-dashed border-muted-foreground/40 text-muted-foreground/70'

        const reading =
          state === 'missing'
            ? `Not set in ${env.name}`
            : `${state === 'on' ? 'Enabled' : 'Disabled'} in ${env.name}`

        const body = (
          <>
            <span
              aria-hidden="true"
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                state === 'on'
                  ? 'bg-emerald'
                  : state === 'off'
                    ? 'bg-muted-foreground/40'
                    : 'border border-muted-foreground/40 bg-transparent'
              }`}
            />
            {env.name}
            {env.isProtected && (
              <Shield className="h-2.5 w-2.5 shrink-0" aria-label={`${env.name} is protected`} />
            )}
            {flag?.modifiedExternally && (
              <span
                className="ml-0.5 h-1.5 w-1.5 rounded-full bg-sky"
                title={`Changed in the cloud store since Flagsweep's last write (${env.name})`}
              />
            )}
          </>
        )

        const shape = `inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${tone}`

        if (!interactive) {
          return (
            <span
              key={env.id}
              title={blocked && flag !== null ? `${reading} — ${blocked}` : reading}
              className={shape}
            >
              {body}
            </span>
          )
        }

        return (
          <button
            key={env.id}
            type="button"
            // The row's name is the link to the flag; a chip acts on one
            // environment, so it must not also navigate.
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggle(env, flag)
            }}
            title={`${reading} — click to ${flag.isEnabled ? 'disable' : 'enable'}`}
            aria-label={`${reading}. Click to ${flag.isEnabled ? 'disable' : 'enable'} ${flagName} in ${env.name}`}
            className={`${shape} cursor-pointer hover:ring-1 hover:ring-foreground/20`}
          >
            {body}
          </button>
        )
      })}
    </div>
  )
}
