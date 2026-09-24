import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { FlagDetailsFields } from './FlagDetailsFields'
import {
  flagDetailsDefaults,
  flagDetailsSchema,
  toUpdateFlagRequest,
  type FlagDetailsValues,
} from './flagDetailsForm'
import type { FeatureFlag, UpdateFlagRequest } from '@/types/flag'
import type { AssignableUser } from '@/types/auth'

interface EditFlagModalProps {
  flag: FeatureFlag | null
  assignableUsers: AssignableUser[]
  onClose: () => void
  onSubmit: (id: string, req: UpdateFlagRequest, ownerId: string | null) => void
  isSubmitting: boolean
}

/**
 * Editing one environment's copy, from that environment's table. A flag's own
 * page edits the same fields inline instead; both render the same form body.
 */
export function EditFlagModal({
  flag,
  assignableUsers,
  onClose,
  onSubmit,
  isSubmitting,
}: EditFlagModalProps) {
  const form = useForm<FlagDetailsValues>({
    resolver: zodResolver(flagDetailsSchema),
    defaultValues: flagDetailsDefaults(null),
  })

  useEffect(() => {
    if (flag) form.reset(flagDetailsDefaults(flag))
  }, [flag, form])

  function handleSubmit(values: FlagDetailsValues) {
    if (!flag) return
    onSubmit(flag.id, toUpdateFlagRequest(values), values.ownerId)
  }

  return (
    <Dialog open={flag !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {flag?.displayName ?? flag?.id}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FlagDetailsFields
              assignableUsers={assignableUsers}
              idPrefix="edit-flag"
              namePlaceholder={flag?.id}
              ownerHint="Ownership is shared across every environment in the connection."
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
