import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Info, Pencil, Shield, Tag, Trash2, Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { ConnectionEnvironment } from '@/types/connection'

interface EnvironmentListProps {
  environments: ConnectionEnvironment[]
  onReorder: (reordered: ConnectionEnvironment[]) => void
  onEdit?: (envId: number, name: string, environmentKey: string | null) => void
  onDelete?: (envId: number) => void
  onToggleProtection?: (envId: number, isProtected: boolean) => void
  showProtection?: boolean
}

function SortableEnvironmentItem({
  env,
  onEdit,
  onDelete,
  onToggleProtection,
  showProtection,
}: {
  env: ConnectionEnvironment
  onEdit?: (envId: number, name: string, environmentKey: string | null) => void
  onDelete?: () => void
  onToggleProtection?: (envId: number, isProtected: boolean) => void
  showProtection?: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(env.name)
  const [editLabel, setEditLabel] = useState(env.environmentKey ?? '')

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: env.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  function handleSave() {
    if (!editName.trim()) return
    onEdit?.(env.id, editName.trim(), editLabel.trim() || null)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false) }}
          className="h-7 text-sm flex-1"
          placeholder="Name"
          autoFocus
        />
        <Input
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false) }}
          className="h-7 text-sm w-32"
          placeholder="Label"
        />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSave}>
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(false)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-md border bg-card px-3 py-2"
    >
      <button
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${env.name}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-sm font-medium flex-1">
        {env.name}
        {env.isProtected && (
          <Shield className="inline-block h-3 w-3 text-muted-foreground ml-1" />
        )}
      </span>
      {env.environmentKey ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="text-xs font-mono cursor-help">
                <Tag className="h-3 w-3 mr-1" />
                {env.environmentKey}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Azure App Configuration label mapped to this environment</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs cursor-help">
                No label
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Custom environment — flags use the default (no label) space in the store</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {showProtection && onToggleProtection && (
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground">Protected</label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info
                  className="h-3.5 w-3.5 text-muted-foreground cursor-help"
                  aria-label="What does protected mean?"
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>Only admins can modify flags in protected environments</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Switch
            checked={env.isProtected}
            onCheckedChange={(checked) => onToggleProtection(env.id, checked)}
            aria-label={`Toggle protection for ${env.name}`}
          />
        </div>
      )}
      {onEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => { setEditName(env.name); setEditLabel(env.environmentKey ?? ''); setIsEditing(true) }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}

export function EnvironmentList({
  environments,
  onReorder,
  onEdit,
  onDelete,
  onToggleProtection,
  showProtection,
}: EnvironmentListProps) {
  const [deleteTarget, setDeleteTarget] = useState<ConnectionEnvironment | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = environments.findIndex((e) => e.id === active.id)
    const newIndex = environments.findIndex((e) => e.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(environments, oldIndex, newIndex)
    onReorder(reordered)
  }

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={environments.map((e) => e.id)}
          strategy={verticalListSortingStrategy}
        >
          {environments.map((env) => (
            <SortableEnvironmentItem
              key={env.id}
              env={env}
              onEdit={onEdit}
              onDelete={onDelete ? () => setDeleteTarget(env) : undefined}
              onToggleProtection={onToggleProtection}
              showProtection={showProtection}
            />
          ))}
        </SortableContext>
      </DndContext>

      {environments.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">
          No environments yet. Add one below.
        </p>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete environment?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes <span className="font-medium">{deleteTarget?.name}</span> from this
              connection in Flagsweep. Nothing is deleted in Azure — the feature flags in your App
              Configuration store are left exactly as they are.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep environment</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  onDelete?.(deleteTarget.id)
                  setDeleteTarget(null)
                }
              }}
            >
              Delete environment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
