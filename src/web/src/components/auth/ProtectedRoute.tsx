import { useState, useEffect } from 'react'
import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { getAuthStatus } from '@/api/authApi'
import { Skeleton } from '@/components/ui/skeleton'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const [isSetup, setIsSetup] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      getAuthStatus()
        .then((status) => setIsSetup(status.isSetup))
        .catch(() => setIsSetup(true))
    }
  }, [isAuthenticated, isLoading])

  if (isLoading || (!isAuthenticated && isSetup === null)) {
    return (
      <div className="flex min-h-screen">
        <div className="w-64 border-r bg-sidebar p-4 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-20" />
          <div className="space-y-2 mt-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-6 w-48 ml-4" />
            <Skeleton className="h-6 w-44 ml-4" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-6 w-48 ml-4" />
          </div>
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={isSetup ? '/login' : '/setup'} replace />
  }

  return <Outlet />
}
