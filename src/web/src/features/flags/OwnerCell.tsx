import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { OwnerCommandList } from './OwnerPicker'
import type { AssignableUser } from '@/types/auth'

/**
 * Owner cell shared by the flag-first and per-environment tables. Ownership is
 * connection-wide, so reassigning from either needs no environment context.
 */
export function OwnerCell({
  owner,
  flagName,
  users,
  canAssign,
  onChange,
}: {
  owner: { ownerId: string | null; ownerEmail: string | null; ownerIsDeleted: boolean }
  flagName: string
  users: AssignableUser[]
  canAssign: boolean
  onChange: (userId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const email = owner.ownerEmail

  function select(userId: string | null) {
    setOpen(false)
    onChange(userId)
  }

  const content = owner.ownerIsDeleted ? (
    <span className="text-sm text-rose" title={`${email ?? 'Owner'} was deleted — reassign this flag`}>
      Deleted user
    </span>
  ) : email ? (
    <>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-subtle text-violet text-[10px] font-semibold uppercase">
        {email.slice(0, 2)}
      </span>
      <span className="text-sm truncate max-w-32">{email.split('@')[0]}</span>
    </>
  ) : (
    <span className="text-sm text-muted-foreground">Unassigned</span>
  )

  if (!canAssign) {
    return (
      <div className="flex items-center gap-1.5 px-2" title={email ?? undefined}>
        {content}
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 gap-1.5 font-normal"
          // Named explicitly: otherwise the accessible name is whatever the cell
          // happens to show ("Unassigned", a username), which identifies neither
          // the control nor the flag it belongs to.
          aria-label={`Owner of ${flagName}`}
          title={email ?? 'Assign an owner'}
        >
          {content}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <OwnerCommandList users={users} selectedId={owner.ownerId} onSelect={select} />
      </PopoverContent>
    </Popover>
  )
}
