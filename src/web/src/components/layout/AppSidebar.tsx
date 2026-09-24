import { Link, useLocation } from 'react-router'
import {
  FolderOpen,
  LayoutDashboard,
  Layers,
  Flag,
  Plus,
  History,
  Settings,
  ChevronRight,
  Shield,
  Users,
} from 'lucide-react'
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import type { Connection } from '@/types/connection'
import type { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LogoMark } from '@/components/shared/LogoMark'

interface AppSidebarProps {
  connections: Connection[]
  userFooter?: ReactNode
}

function SidebarLogo() {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1">
      <LogoMark size={28} />
      <span className="text-base font-bold tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
        Flagsweep
      </span>
    </div>
  )
}

export function AppSidebar({ connections, userFooter }: AppSidebarProps) {
  const { isAdmin } = useAuth()

  const location = useLocation()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarLogo />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Dashboard"
                  isActive={location.pathname === '/'}
                >
                  <Link to="/">
                    <LayoutDashboard className="shrink-0 text-sky" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Users"
                    isActive={location.pathname === '/users'}
                  >
                    <Link to="/users">
                      <Users className="shrink-0 text-violet" />
                      <span>Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between pr-1">
            Connections
            {isAdmin && (
              <Link
                to="/new-connection"
                className="hover:text-foreground"
                title="New connection"
                aria-label="New connection"
              >
                <Plus className="h-3.5 w-3.5" />
              </Link>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>

              {connections.map((connection) => {
                const envMatch = location.pathname.match(
                  new RegExp(`^/connections/${connection.id}/environments/(\\d+)`)
                )
                const activeEnv = envMatch
                  ? connection.environments.find((e) => e.id === Number(envMatch[1]))
                  : null
                const flagsPath = `/connections/${connection.id}/flags`
                const auditPath = `/connections/${connection.id}/audit`
                const settingsPath = `/connections/${connection.id}/settings`
                const envState = activeEnv
                  ? { fromEnvironmentId: activeEnv.id, fromEnvironmentName: activeEnv.name }
                  : undefined

                return (
                  <Collapsible key={connection.id} defaultOpen className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={connection.name}>
                          <FolderOpen className="shrink-0 text-amber" />
                          <span>{connection.name}</span>
                          <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground group-data-[collapsible=icon]:hidden">
                            {connection.providerType}
                          </span>
                          <ChevronRight className="ml-auto shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location.pathname.startsWith(flagsPath)}
                            >
                              <Link to={flagsPath}>
                                <Flag className="shrink-0 text-flamingo-light" />
                                <span>Flags</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          {/* Environments stay reachable for per-environment work.
                              Flags leading the list is what makes this flag-first;
                              hiding environments behind a click would only cost
                              discoverability. Collapsible so long lists can be
                              folded away by hand. */}
                          <Collapsible defaultOpen className="group/envs">
                            <SidebarMenuSubItem>
                              <CollapsibleTrigger asChild>
                                <SidebarMenuSubButton>
                                  <Layers className="shrink-0 text-emerald" />
                                  <span>Environments</span>
                                  <ChevronRight className="ml-auto shrink-0 transition-transform duration-200 group-data-[state=open]/envs:rotate-90" />
                                </SidebarMenuSubButton>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <SidebarMenuSub>
                                  {[...connection.environments]
                                    .sort((a, b) => a.sortOrder - b.sortOrder)
                                    .map((env) => {
                                      const envPath = `/connections/${connection.id}/environments/${env.id}`
                                      return (
                                        <SidebarMenuSubItem key={env.id}>
                                          <SidebarMenuSubButton
                                            asChild
                                            isActive={location.pathname === envPath}
                                          >
                                            <Link to={envPath}>
                                              <span>{env.name}</span>
                                              {env.isProtected && (
                                                <Shield className="h-3 w-3 text-muted-foreground ml-1 shrink-0" />
                                              )}
                                            </Link>
                                          </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                      )
                                    })}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            </SidebarMenuSubItem>
                          </Collapsible>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location.pathname === auditPath}
                            >
                              <Link to={auditPath} state={envState}>
                                <History className="shrink-0 text-sky" />
                                <span>Audit</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          {isAdmin && (
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton
                                asChild
                                isActive={location.pathname === settingsPath}
                              >
                                <Link to={settingsPath} state={envState}>
                                  <Settings className="shrink-0 text-muted-foreground" />
                                  <span>Settings</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {userFooter}

      <SidebarRail />
    </Sidebar>
  )
}
