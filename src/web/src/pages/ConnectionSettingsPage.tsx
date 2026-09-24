import { useParams, useLocation } from 'react-router'
import { BreadcrumbHeader } from '@/components/shared/BreadcrumbHeader'
import { ConnectionSettings } from '@/features/connections/ConnectionSettings'
import { useConnection } from '@/hooks/useConnections'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Settings } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface LocationState {
  fromEnvironmentId?: number
  fromEnvironmentName?: string
}

export function ConnectionSettingsPage() {
  const { isAdmin } = useAuth()
  const { connectionId } = useParams<{ connectionId: string }>()
  const location = useLocation()
  const numericConnectionId = Number(connectionId)

  const state = location.state as LocationState | null
  const { data: connection, isLoading } = useConnection(numericConnectionId)

  if (!isAdmin) {
    return (
      <>
        <div className="flex items-center gap-3 border-b px-6 py-3">
          <SidebarTrigger className="hidden md:flex" />
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">Only admins can edit connection settings.</p>
        </div>
      </>
    )
  }

  if (isLoading || !connection) {
    return <PageSkeleton />
  }

  return (
    <>
      <BreadcrumbHeader
        connectionName={connection.name}
        connectionId={connection.id}
        environmentName={state?.fromEnvironmentName}
        environmentId={state?.fromEnvironmentId}
        pageName="Settings"
        actions={
          <Settings className="h-4 w-4 text-muted-foreground" />
        }
      />
      <div className="p-6 page-enter">
        <ConnectionSettings connectionId={numericConnectionId} />
      </div>
    </>
  )
}
