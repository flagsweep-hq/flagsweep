import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Check, ChevronsUpDown } from 'lucide-react'
import type { AssignableUser } from '@/types/auth'

/**
 * The searchable teammate list. Shared by the owner cell in the flag table and
 * the owner field in the create/edit dialogs, so search behaves the same in all
 * three; each caller brings its own trigger.
 *
 * Callers must wrap this in a Popover, not a DropdownMenu: a dropdown's own
 * typeahead swallows keystrokes before the search box ever sees them.
 */
export function OwnerCommandList({
  users,
  selectedId,
  onSelect,
}: {
  users: AssignableUser[]
  selectedId: string | null
  onSelect: (userId: string | null) => void
}) {
  return (
    <Command>
      <CommandInput placeholder="Search teammates..." />
      <CommandList>
        <CommandEmpty>No teammate found.</CommandEmpty>
        <CommandGroup heading="Flag owner">
          <CommandItem value="unassigned" onSelect={() => onSelect(null)}>
            <span className="text-muted-foreground">Unassigned</span>
            {!selectedId && <Check className="h-4 w-4 ml-auto" />}
          </CommandItem>
          {users.map((user) => (
            <CommandItem key={user.id} value={user.email} onSelect={() => onSelect(user.id)}>
              <span className="truncate">{user.email}</span>
              {selectedId === user.id && <Check className="h-4 w-4 ml-auto" />}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}

/** Full-width owner combobox for use inside a form. */
export function OwnerPicker({
  id,
  value,
  users,
  onChange,
  disabled,
}: {
  id?: string
  value: string | null
  users: AssignableUser[]
  onChange: (userId: string | null) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = users.find((u) => u.id === value)

  function select(userId: string | null) {
    setOpen(false)
    onChange(userId)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="truncate">{selected.email}</span>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <OwnerCommandList users={users} selectedId={value} onSelect={select} />
      </PopoverContent>
    </Popover>
  )
}
