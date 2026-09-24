import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog'
import type { FeatureFlag } from '@/types/flag'

interface ToggleConfirmDialogProps {
  flag: FeatureFlag | null
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  /** Named when the toggle came from a view spanning several environments. */
  environmentName?: string
}

export function ToggleConfirmDialog({
  flag,
  open,
  onConfirm,
  onCancel,
  environmentName,
}: ToggleConfirmDialogProps) {
  if (!flag) return null
  const action = flag.isEnabled ? 'disable' : 'enable'
  const flagName = flag.displayName ?? flag.id

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Confirm {action}
            {environmentName && ` in ${environmentName}`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to {action} <strong>{flagName}</strong>
            {environmentName && (
              <>
                {' '}
                in <strong>{environmentName}</strong>
              </>
            )}
            ? This change will write through to Azure App Config immediately.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Yes, {action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
