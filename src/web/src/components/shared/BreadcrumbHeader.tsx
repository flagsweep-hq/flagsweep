import { Link } from 'react-router'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useAuth } from '@/contexts/AuthContext'

interface BreadcrumbHeaderProps {
  connectionName: string
  connectionId?: number
  environmentName?: string
  environmentId?: number
  pageName?: string
  actions?: React.ReactNode
}

export function BreadcrumbHeader({
  connectionName,
  connectionId,
  environmentName,
  environmentId,
  pageName,
  actions,
}: BreadcrumbHeaderProps) {
  const { isAdmin } = useAuth()
  return (
    <div className="flex items-center justify-between border-b px-6 py-3 bg-card/50">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="hidden md:flex" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              {connectionId && isAdmin ? (
                <BreadcrumbLink asChild>
                  <Link to={`/connections/${connectionId}/settings`}>
                    {connectionName}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{connectionName}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {environmentName && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {pageName && connectionId && environmentId ? (
                    <BreadcrumbLink asChild>
                      <Link to={`/connections/${connectionId}/environments/${environmentId}`}>
                        {environmentName}
                      </Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{environmentName}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </>
            )}
            {pageName && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{pageName}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
