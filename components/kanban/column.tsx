"use client"

import { useState } from "react"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useDroppable } from "@dnd-kit/core"
import { MoreHorizontal, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useKanban } from "@/lib/kanban-store"
import { useIdentity } from "@/lib/identity"
import { TaskCard } from "./task-card"
import type { Column as ColumnType, Task } from "@/lib/types"
import { toast } from "sonner"

export function Column({
  column,
  tasks,
  onOpenTask,
  currentProjectFilterId,
}: {
  column: ColumnType
  tasks: Task[]
  onOpenTask: (id: string) => void
  currentProjectFilterId: string | null
}) {
  const { createTask, renameColumn, deleteColumn } = useKanban()
  const { identity } = useIdentity()
  const [addingNew, setAddingNew] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(column.name)

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", columnId: column.id },
  })

  async function handleAdd() {
    const title = newTitle.trim()
    if (!title) {
      setAddingNew(false)
      return
    }
    const task = await createTask({
      title,
      columnId: column.id,
      projectId: currentProjectFilterId,
      actor: identity?.id ?? "me",
    })
    if (task) {
      setNewTitle("")
      setAddingNew(false)
    }
  }

  async function handleRename() {
    const name = renameValue.trim()
    if (!name || name === column.name) {
      setRenaming(false)
      setRenameValue(column.name)
      return
    }
    await renameColumn(column.id, name)
    setRenaming(false)
  }

  async function handleDelete() {
    if (tasks.length > 0) {
      toast.error("Move or delete tasks in this column first.")
      return
    }
    await deleteColumn(column.id)
  }

  return (
    <div
      className={cn(
        "flex h-full w-[300px] flex-none flex-col rounded-xl border border-border/50 bg-sidebar/60 p-2 transition-colors",
        isOver && "border-primary/50 bg-accent/30",
      )}
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-2 px-2 pt-1.5">
        {renaming ? (
          <Input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename()
              if (e.key === "Escape") {
                setRenaming(false)
                setRenameValue(column.name)
              }
            }}
            className="h-7 px-2 text-sm"
          />
        ) : (
          <button
            type="button"
            onDoubleClick={() => setRenaming(true)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span className="truncate text-sm font-semibold">{column.name}</span>
            <span className="text-xs font-medium text-muted-foreground">{tasks.length}</span>
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Column actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setRenaming(true)}>Rename</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAddingNew(true)}>Add task</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Task list (scrollable) */}
      <div
        ref={setNodeRef}
        className="scrollbar-subtle flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-1 pb-1"
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={() => onOpenTask(task.id)} />
          ))}
        </SortableContext>
        {tasks.length === 0 && !addingNew && (
          <div className="my-2 rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
            Drop tasks here
          </div>
        )}

        {addingNew && (
          <div className="rounded-lg border border-border/60 bg-card p-2">
            <textarea
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleAdd()
                }
                if (e.key === "Escape") {
                  setAddingNew(false)
                  setNewTitle("")
                }
              }}
              placeholder="Task title..."
              className="min-h-[56px] w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <div className="mt-2 flex items-center gap-2">
              <Button size="sm" className="h-7 px-3 text-xs" onClick={handleAdd}>
                Add task
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setAddingNew(false)
                  setNewTitle("")
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer add button */}
      {!addingNew && (
        <Button
          variant="ghost"
          className="mt-1 h-8 w-full justify-start gap-2 px-2 text-sm font-normal text-muted-foreground hover:bg-accent/40"
          onClick={() => setAddingNew(true)}
        >
          <Plus className="h-4 w-4" />
          Add task
        </Button>
      )}
    </div>
  )
}
