import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Folder, Globe } from 'lucide-react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { useConnections } from '@/hooks/useConnections'
import { useAuth } from '@/contexts/AuthContext'

export function CommandSearch() {
  const { isAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const params = useParams<{ connectionId?: string }>()
  const currentConnectionId = params.connectionId ? Number(params.connectionId) : null

  const { data: connections = [] } = useConnections()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleSelect(connectionId: number, environmentId: number) {
    navigate(`/connections/${connectionId}/environments/${environmentId}`)
    setOpen(false)
  }

  const sortedConnections = [...connections].sort((a, b) => {
    if (a.id === currentConnectionId) return -1
    if (b.id === currentConnectionId) return 1
    return a.name.localeCompare(b.name)
  })

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search"
      description="Search connections and environments"
    >
      <CommandInput placeholder="Search connections and environments..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {sortedConnections.map((connection) => (
          <CommandGroup
            key={connection.id}
            heading={connection.name}
          >
            {connection.environments.length === 0 ? (
              <CommandItem
                disabled={!isAdmin}
                onSelect={() => {
                  if (!isAdmin) return
                  navigate(`/connections/${connection.id}/settings`)
                  setOpen(false)
                }}
              >
                <Folder className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {isAdmin ? 'No environments - go to settings' : 'No environments'}
                </span>
              </CommandItem>
            ) : (
              connection.environments.map((env) => (
                <CommandItem
                  key={env.id}
                  value={`${connection.name} ${env.name} ${env.environmentKey ?? ''}`}
                  onSelect={() => handleSelect(connection.id, env.id)}
                >
                  <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{env.name}</span>
                  {env.environmentKey && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {env.environmentKey}
                    </span>
                  )}
                </CommandItem>
              ))
            )}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
