import { formatDistanceToNow, parseISO } from 'date-fns'
import { Lock, LockOpen, Plus, Shield, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { copyForEnvironment, frozenReason, type DesiredState } from './flagEnvironmentEdits'
import type { FeatureFlag } from '@/types/flag'
import type { ConnectionEnvironment } from '@/types/connection'

/** When this copy was last written, or nothing if the stamp is unreadable. */
function writtenAgo(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true })
  } catch {
    return ''
  }
}

/**
 * One row per environment: current state, the pending change if any, and the
 * control to make it.
 */
export function FlagEnvironmentRows({
  flagName,
  copies,
  environments,
  isAdmin,
  desired,
  update,
  canLock = false,
}: {
  flagName: string
  copies: FeatureFlag[]
  environments: ConnectionEnvironment[]
  isAdmin: boolean
  desired: Record<number, DesiredState>
  update: (envId: number, patch: Partial<DesiredState>) => void
  /**
   * Show the per-environment lock control. The caller decides who qualifies --
   * an admin, or the flag's owner. Like every other control here it stages the
   * change; the apply orders unlocks before writes and locks after them.
   */
  canLock?: boolean
}) {
  return (
    <div className="divide-y rounded-md border">
      {environments.map((env) => {
        const flag = copyForEnvironment(copies, env)
        const want = desired[env.id] ?? { adding: false, enabled: false, locked: false }
        // Freeze on the lock as intended, not as stored: staging an unlock frees
        // the value control, and the apply releases the lock before writing.
        const frozen = frozenReason(env, isAdmin, want.locked)
        const lockChanged = flag !== null && want.locked !== flag.isLocked
        // A held lock must not disable the control that releases it, but
        // protection must: a member writes nothing in a protected environment.
        const blockedByProtection = env.isProtected && !isAdmin

        return (
          <div key={env.id} className="flex items-center gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">{env.name}</span>
                {env.isProtected && (
                  <Shield
                    className="h-3 w-3 shrink-0 text-muted-foreground"
                    aria-label={`${env.name} is protected`}
                  />
                )}
              </div>
              {frozen ? (
                <span className="text-xs text-muted-foreground">{frozen}</span>
              ) : flag === null && !want.adding ? (
                <span className="text-xs text-muted-foreground italic">Not set</span>
              ) : flag === null ? (
                <span className="text-xs text-emerald">Will be created</span>
              ) : want.enabled !== flag.isEnabled || lockChanged ? (
                <span className="text-xs text-amber">
                  {want.enabled !== flag.isEnabled && (
                    <>
                      {flag.isEnabled ? 'Enabled' : 'Disabled'} &rarr;{' '}
                      {want.enabled ? 'Enabled' : 'Disabled'}
                    </>
                  )}
                  {want.enabled !== flag.isEnabled && lockChanged && ' · '}
                  {lockChanged && (want.locked ? 'will be locked' : 'will be unlocked')}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {flag.isEnabled ? 'Enabled' : 'Disabled'}
                  {flag.lastModified && <> &middot; {writtenAgo(flag.lastModified)}</>}
                </span>
              )}
            </div>

            {canLock && flag !== null && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={blockedByProtection}
                className={
                  lockChanged ? 'text-amber' : 'text-muted-foreground hover:text-foreground'
                }
                title={
                  blockedByProtection
                    ? `${env.name} is protected — admins only`
                    : want.locked
                      ? `Unlock ${flagName} in ${env.name}`
                      : `Lock ${flagName} in ${env.name}`
                }
                onClick={() => update(env.id, { locked: !want.locked })}
              >
                {want.locked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                <span className="sr-only">
                  {want.locked ? 'Unlock' : 'Lock'} {flagName} in {env.name}
                </span>
              </Button>
            )}

            {flag === null && !want.adding ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Add ${flagName} to ${env.name}`}
                disabled={!!frozen}
                onClick={() => update(env.id, { adding: true, enabled: false })}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            ) : (
              <>
                <Switch
                  aria-label={`${flagName} in ${env.name}`}
                  checked={want.enabled}
                  disabled={!!frozen}
                  onCheckedChange={(checked) => update(env.id, { enabled: checked })}
                />
                {flag === null && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title={`Don't add ${flagName} to ${env.name}`}
                    onClick={() => update(env.id, { adding: false, enabled: false })}
                  >
                    <Undo2 className="h-4 w-4" />
                    <span className="sr-only">Cancel adding to {env.name}</span>
                  </Button>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Shown when new copies are queued, so the audit consequences are not a surprise. */
export function CreateCopyNote() {
  return (
    <p className="text-xs text-muted-foreground">
      New copies inherit this flag's name, description and retire-by date, and are created
      disabled. Any that you switched on are enabled as a second audited change.
    </p>
  )
}
