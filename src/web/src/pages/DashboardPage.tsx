import { SidebarTrigger } from '@/components/ui/sidebar'
import { Dashboard } from '@/features/dashboard/Dashboard'

export function DashboardPage() {
  return (
    <>
      <div className="flex items-center gap-3 border-b px-6 py-3">
        <SidebarTrigger className="hidden md:flex" />
        <h1 className="text-sm font-semibold tracking-tight">Dashboard</h1>
      </div>
      <div className="p-6 page-enter">
        <Dashboard />
      </div>
    </>
  )
}
