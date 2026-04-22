"use client"

import { useMemo, useState } from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Column } from "./column"
import { TaskCard } from "./task-card"
import { TaskDialog } from "./task-dialog"
import { useKanban } from "@/lib/kanban-store"
import { useIdentity } from "@/lib/identity"
import type { Task } from "@/lib/types"

export function Board({ projectFilterId }: { projectFilterId: string | null }) {
  const { columns, tasks, moveTask, addColumn } = useKanban()
  const { identity } = useIdentity()

  // Local draft to allow cross-column movement during drag
  const [draftTasks, setDraftTasks] = useState<Task[] | null>(null)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [newColumnName, setNewColumnName] = useState("")
  const [addColumnOpen, setAddColumnOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const effectiveTasks = draftTasks ?? tasks

  const visibleColumns = useMemo(
    () => columns.filter((c) => c.name.trim().toLowerCase() !== "backlog"),
    [columns],
  )

  const tasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const col of visibleColumns) map[col.id] = []
    for (const t of effectiveTasks) {
      if (!t.column_id) continue
      if (!map[t.column_id]) continue
      if (projectFilterId && t.project_id !== projectFilterId) continue
      map[t.column_id].push(t)
    }
    for (const col of visibleColumns) {
      map[col.id]?.sort((a, b) => a.position - b.position)
    }
    return map
  }, [visibleColumns, effectiveTasks, projectFilterId])

  const activeTask = activeTaskId ? effectiveTasks.find((t) => t.id === activeTaskId) ?? null : null

  function findColumnOf(id: string): string | null {
    const asTask = effectiveTasks.find((t) => t.id === id)
    if (asTask) return asTask.column_id
    if (columns.some((c) => c.id === id)) return id
    return null
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(String(event.active.id))
    setDraftTasks(tasks)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    setDraftTasks((prev) => {
      const base = prev ?? tasks
      const activeTask = base.find((t) => t.id === activeId)
      if (!activeTask) return base

      const fromCol = activeTask.column_id
      const toCol = findColumnOf(overId)
      if (!toCol) return base

      if (fromCol === toCol) {
        // Reorder within same column
        const colTasks = base
          .filter((t) => t.column_id === toCol)
          .sort((a, b) => a.position - b.position)
        const oldIndex = colTasks.findIndex((t) => t.id === activeId)
        let newIndex: number
        if (columns.some((c) => c.id === overId)) {
          newIndex = colTasks.length - 1
        } else {
          newIndex = colTasks.findIndex((t) => t.id === overId)
        }
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return base
        const reordered = arrayMove(colTasks, oldIndex, newIndex).map((t, i) => ({
          ...t,
          position: i,
        }))
        const byId = new Map(base.map((t) => [t.id, t]))
        reordered.forEach((t) => byId.set(t.id, t))
        return Array.from(byId.values())
      }

      // Cross-column move
      const destTasks = base
        .filter((t) => t.column_id === toCol)
        .sort((a, b) => a.position - b.position)
      let insertIndex: number
      if (columns.some((c) => c.id === overId)) {
        insertIndex = destTasks.length
      } else {
        insertIndex = destTasks.findIndex((t) => t.id === overId)
        if (insertIndex === -1) insertIndex = destTasks.length
      }

      const newActive: Task = { ...activeTask, column_id: toCol }
      const destNext = [
        ...destTasks.slice(0, insertIndex),
        newActive,
        ...destTasks.slice(insertIndex),
      ].map((t, i) => ({ ...t, position: i }))

      const sourceTasks = base
        .filter((t) => t.column_id === fromCol && t.id !== activeId)
        .sort((a, b) => a.position - b.position)
        .map((t, i) => ({ ...t, position: i }))

      const byId = new Map(base.map((t) => [t.id, t]))
      sourceTasks.forEach((t) => byId.set(t.id, t))
      destNext.forEach((t) => byId.set(t.id, t))
      byId.set(newActive.id, newActive)
      // Ensure updated position from destNext
      const activeFromDest = destNext.find((t) => t.id === activeId)
      if (activeFromDest) byId.set(activeId, activeFromDest)
      return Array.from(byId.values())
    })
  }

  async function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id)
    const draft = draftTasks
    setActiveTaskId(null)
    setDraftTasks(null)

    if (!draft) return
    const moved = draft.find((t) => t.id === activeId)
    const original = tasks.find((t) => t.id === activeId)
    if (!moved || !original || !moved.column_id) return

    const colId = moved.column_id
    const colTasks = draft
      .filter((t) => t.column_id === colId)
      .sort((a, b) => a.position - b.position)
    const newIndex = colTasks.findIndex((t) => t.id === activeId)

    if (original.column_id === colId && original.position === newIndex) return

    await moveTask(activeId, colId, newIndex, identity?.id ?? "me")
  }

  async function handleAddColumn() {
    const name = newColumnName.trim()
    if (!name) return
    await addColumn(name)
    setNewColumnName("")
    setAddColumnOpen(false)
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveTaskId(null)
          setDraftTasks(null)
        }}
      >
        <div className="scrollbar-subtle flex h-full gap-3 overflow-x-auto overflow-y-hidden px-6 pb-6">
          {visibleColumns
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((col) => (
              <Column
                key={col.id}
                column={col}
                tasks={tasksByColumn[col.id] ?? []}
                onOpenTask={setOpenTaskId}
                currentProjectFilterId={projectFilterId}
              />
            ))}

          <div className="flex-none pt-1">
            <Popover open={addColumnOpen} onOpenChange={setAddColumnOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 w-[260px] justify-start gap-2 border-dashed text-sm font-normal text-muted-foreground"
                >
                  <Plus className="h-4 w-4" />
                  Add column
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64">
                <div className="space-y-2">
                  <Input
                    autoFocus
                    placeholder="Column name"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddColumn()
                    }}
                    className="h-8"
                  />
                  <Button size="sm" className="w-full" onClick={handleAddColumn}>
                    Add column
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-[300px]">
              <TaskCard task={activeTask} onOpen={() => {}} isDragOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskDialog taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
    </>
  )
}
