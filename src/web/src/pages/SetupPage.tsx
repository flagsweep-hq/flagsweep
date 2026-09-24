import { useNavigate } from 'react-router'
import { SetupWizard } from '@/features/connections/SetupWizard'
import { useConnections } from '@/hooks/useConnections'
import type { Connection } from '@/types/connection'
import { useAuth } from '@/contexts/AuthContext'

export function SetupPage() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const { data: connections } = useConnections()

  const isFirstConnection = !connections || connections.length === 0

  function handleComplete(connection: Connection) {
    const firstEnv = connection.environments[0]
    navigate(
      firstEnv
        ? `/connections/${connection.id}/environments/${firstEnv.id}`
        : `/connections/${connection.id}/settings`,
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Only admins can create connections.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-lg px-4 space-y-6 animate-slide-up">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            {isFirstConnection ? 'Welcome to Flagsweep' : 'Create a new connection'}
          </h1>
          {isFirstConnection && (
            <p className="text-muted-foreground">
              Let's set up your first connection to start managing feature flags.
            </p>
          )}
        </div>

        <SetupWizard onComplete={handleComplete} />
      </div>
    </div>
  )
}
