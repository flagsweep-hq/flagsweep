import { Outlet, useNavigate } from 'react-router'
import { LogOut, KeyRound, ChevronsUpDown } from 'lucide-react'
import { SidebarProvider, SidebarInset, SidebarTrigger, SidebarFooter } from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { AppSidebar } from './AppSidebar'
import { CommandSearch } from '@/components/shared/CommandSearch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useConnections } from '@/hooks/useConnections'
import { useAuth } from '@/contexts/AuthContext'
import { LogoMark } from '@/components/shared/LogoMark'

export function RootLayout() {
  const { data: connections, isLoading } = useConnections()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="flex min-h-screen animate-fade-in">
        <div className="w-64 border-r bg-sidebar p-4 space-y-4">
          <div className="flex items-center gap-2.5 px-2 py-1">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-1.5 mt-6">
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
          <div className="space-y-1.5 mt-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
          <div className="space-y-1.5 mt-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-6 w-40 ml-6" />
            <Skeleton className="h-6 w-36 ml-6" />
          </div>
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar connections={connections ?? []} userFooter={
        user && (
          <SidebarFooter>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-2.5 rounded-md p-2 text-left hover:bg-sidebar-accent transition-colors outline-hidden">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground uppercase">
                    {user.email.charAt(0)}
                  </span>
                  <div className="flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <span className="text-sm font-medium truncate text-sidebar-foreground">{user.email}</span>
                    <span className="text-xs text-sidebar-foreground/60">{user.role}</span>
                  </div>
                  <ChevronsUpDown className="size-4 text-sidebar-foreground/40 shrink-0 group-data-[collapsible=icon]:hidden" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate">{user.email}</span>
                    <span className="text-xs text-muted-foreground">{user.role}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/change-password')}>
                  <KeyRound className="size-4 mr-2" />
                  Change password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="size-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        )
      } />
      <SidebarInset>
        <div className="flex items-center gap-2 border-b px-4 py-2 md:hidden">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <LogoMark size={20} />
            <span className="text-sm font-bold tracking-tight">Flagsweep</span>
          </div>
        </div>
        <Outlet />
      </SidebarInset>
      <CommandSearch />
    </SidebarProvider>
  )
}
