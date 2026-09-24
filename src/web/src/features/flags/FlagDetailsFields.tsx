import { useFormContext } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { OwnerPicker } from './OwnerPicker'
import type { FlagDetailsValues } from './flagDetailsForm'
import type { AssignableUser } from '@/types/auth'

/**
 * The form body for a flag's own details. Rendered by the create dialog, the
 * per-environment table's edit dialog and inline on a flag's page, so all three
 * offer the same fields in the same order. Reads the surrounding <Form>, whose
 * values must include FlagDetailsValues.
 */
export function FlagDetailsFields({
  assignableUsers,
  idPrefix,
  namePlaceholder,
  ownerHint,
  retireByHint = 'Leave empty for no retire-by date.',
}: {
  assignableUsers: AssignableUser[]
  /** Keeps input ids unique when a dialog and a page are both mounted. */
  idPrefix: string
  namePlaceholder?: string
  ownerHint: string
  retireByHint?: string
}) {
  const { control, watch } = useFormContext<FlagDetailsValues>()
  const isPermanent = watch('isPermanent')

  return (
    <>
      <FormField
        control={control}
        name="displayName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder={namePlaceholder} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Input placeholder="What does this flag control?" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="ownerId"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor={`${idPrefix}-owner`}>Owner</FormLabel>
            <FormControl>
              <OwnerPicker
                id={`${idPrefix}-owner`}
                value={field.value}
                users={assignableUsers}
                onChange={field.onChange}
              />
            </FormControl>
            <p className="text-xs text-muted-foreground">{ownerHint}</p>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="isPermanent"
        render={({ field }) => (
          <FormItem className="flex items-center gap-3">
            <FormLabel className="mt-0">Permanent flag</FormLabel>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <span className="text-xs text-muted-foreground">Exempt from retirement / cleanup</span>
          </FormItem>
        )}
      />
      {!isPermanent && (
        <FormField
          control={control}
          name="expiresAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Retire-by date</FormLabel>
              <FormControl>
                <Input type="date" className="w-fit" {...field} />
              </FormControl>
              <p className="text-xs text-muted-foreground">{retireByHint}</p>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  )
}
