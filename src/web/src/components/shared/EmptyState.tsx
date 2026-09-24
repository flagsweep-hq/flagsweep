import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router'

interface EmptyStateAction {
  label: string
  href?: string
  onAction?: () => void
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: EmptyStateAction
}

function ActionButton({ action }: { action: EmptyStateAction }) {
  if (action.href) {
    return (
      <Button asChild>
        <Link to={action.href}>{action.label}</Link>
      </Button>
    )
  }

  return (
    <Button onClick={action.onAction}>
      {action.label}
    </Button>
  )
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center space-y-5 animate-fade-in">
      <div className="rounded-2xl bg-flamingo-subtle p-4">
        <Icon className="h-10 w-10 text-flamingo" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-md">{description}</p>
      </div>
      {action && (
        <div className="flex gap-3 pt-1">
          <ActionButton action={action} />
        </div>
      )}
    </div>
  )
}
