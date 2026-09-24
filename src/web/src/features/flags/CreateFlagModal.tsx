import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FlagDetailsFields } from './FlagDetailsFields'
import { flagDetailsDefaults, flagDetailsSchema, retireByIso } from './flagDetailsForm'
import { Shield } from 'lucide-react'
import type { AssignableUser } from '@/types/auth'
import type { ConnectionEnvironment } from '@/types/connection'

const createFlagSchema = flagDetailsSchema.extend({
  id: z.string()
    .min(1, 'Flag name is required')
    .max(200, 'Flag name must be 200 characters or less')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Flag ID can contain letters, numbers, dots, hyphens, and underscores'),
  environmentIds: z.array(z.number()).min(1, 'Pick at least one environment'),
})

type CreateFlagFormValues = z.infer<typeof createFlagSchema>

interface CreateFlagModalProps {
  open: boolean
  environments: ConnectionEnvironment[]
  currentEnvironmentId: number
  canModifyProtected: boolean
  assignableUsers: AssignableUser[]
  onClose: () => void
  onSubmit: (values: {
    id: string
    labels: (string | null)[]
    displayName: string | null
    description: string | null
    isPermanent: boolean
    expiresAt: string | null
    ownerId: string | null
  }) => void
  isSubmitting: boolean
}

function defaultExpiryDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 90)
  return d.toISOString().slice(0, 10)
}

function emptyFormValues(currentEnvironmentId: number): CreateFlagFormValues {
  return {
    ...flagDetailsDefaults(null),
    id: '',
    expiresAt: defaultExpiryDate(),
    environmentIds: [currentEnvironmentId],
  }
}

export function CreateFlagModal({
  open,
  environments,
  currentEnvironmentId,
  canModifyProtected,
  assignableUsers,
  onClose,
  onSubmit,
  isSubmitting,
}: CreateFlagModalProps) {
  const form = useForm<CreateFlagFormValues>({
    resolver: zodResolver(createFlagSchema),
    defaultValues: emptyFormValues(currentEnvironmentId),
  })

  useEffect(() => {
    if (open) form.reset(emptyFormValues(currentEnvironmentId))
  }, [open, currentEnvironmentId, form])

  function handleSubmit(values: CreateFlagFormValues) {
    const labels = environments
      .filter((env) => values.environmentIds.includes(env.id))
      .map((env) => env.environmentKey)

    onSubmit({
      id: values.id,
      labels,
      displayName: values.displayName || null,
      description: values.description || null,
      isPermanent: values.isPermanent,
      expiresAt: retireByIso(values),
      ownerId: values.ownerId,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Feature Flag</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Flags start disabled. Enable them from the flag table so the change is audited.
          </p>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Flag ID</FormLabel>
                  <FormControl>
                    <Input placeholder="my-feature-flag" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="environmentIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Environments</FormLabel>
                  <div className="space-y-2 rounded-md border p-3">
                    {environments.map((env) => {
                      const locked = env.isProtected && !canModifyProtected
                      const checked = field.value.includes(env.id)
                      return (
                        <div key={env.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`env-${env.id}`}
                            aria-label={env.name}
                            checked={checked}
                            disabled={locked}
                            onCheckedChange={(value) =>
                              field.onChange(
                                value === true
                                  ? [...field.value, env.id]
                                  : field.value.filter((id) => id !== env.id)
                              )
                            }
                          />
                          <label
                            htmlFor={`env-${env.id}`}
                            className={`flex items-center gap-1.5 text-sm ${locked ? 'text-muted-foreground' : 'cursor-pointer'}`}
                          >
                            {env.name}
                            {env.isProtected && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Shield className="h-3 w-3" aria-hidden="true" />
                                {locked ? 'Admins only' : 'Protected'}
                              </span>
                            )}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The flag is created in every selected environment with these same settings.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FlagDetailsFields
              assignableUsers={assignableUsers}
              idPrefix="create-flag"
              namePlaceholder="My Feature Flag"
              ownerHint="Ownership is shared across every environment in the connection."
              retireByHint="Defaults to 90 days out."
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Flag'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
