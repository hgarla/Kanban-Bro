"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Calendar, CheckSquare, Github, MessageSquare, Paperclip } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useKanban } from "@/lib/kanban-store"
import { PRIORITY_META, formatDueDate, hexWithAlpha } from "@/lib/kanban-utils"
import type { Task } from "@/lib/types"

export function TaskCard({
  task,
  onOpen,
  isDragOverlay,
}: {
  task: Task
  onOpen: () => void
  isDragOverlay?: boolean
}) {
  const { labels, taskLabels, checklist, attachments, comments, projects } = useKanban()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", columnId: task.column_id },
    disabled: isDragOverlay,
  })

  const style = isDragOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      }

  const taskLabelIds = taskLabels.filter((l) => l.task_id === task.id).map((l) => l.label_id)
  const taskLabelObjects = labels.filter((l) => taskLabelIds.includes(l.id))
  const taskChecklist = checklist.filter((c) => c.task_id === task.id)
  const taskAttachments = attachments.filter((a) => a.task_id === task.id)
  const taskComments = comments.filter((c) => c.task_id === task.id)
  const project = projects.find((p) => p.id === task.project_id)
  const due = formatDueDate(task.due_date)
  const priority = PRIORITY_META[task.priority]

  const doneItems = taskChecklist.filter((c) => c.done).length
  const totalItems = taskChecklist.length

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      type="button"
      onClick={(e) => {
        // Only open if it wasn't a drag
        if (!isDragging) onOpen()
      }}
      className={cn(
        "group relative w-full cursor-grab rounded-lg border border-border/60 bg-card p-3 text-left shadow-sm transition-all",
        "hover:border-border hover:bg-card/80 hover:shadow-md",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isDragging && "opacity-30",
        isDragOverlay && "cursor-grabbing rotate-1 scale-[1.02] shadow-2xl ring-1 ring-primary/40",
      )}
    >
      {/* Top row: project tag + priority */}
      <div className="mb-2 flex items-center justify-between gap-2">
        {project ? (
          <span
            className="inline-flex max-w-[70%] items-center gap-1.5 truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
            style={{
              backgroundColor: hexWithAlpha(project.color, 0.15),
              color: project.color,
            }}
          >
            <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ backgroundColor: project.color }} />
            <span className="truncate">{project.name}</span>
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">No project</span>
        )}
        <span className={cn("flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide", priority.text)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", priority.dot)} />
          {priority.label}
        </span>
      </div>

      {/* Title */}
      <div className="mb-1 text-sm font-medium leading-snug text-pretty">{task.title}</div>

      {/* Description */}
      {task.description?.trim() && (
        <div className="mb-2 line-clamp-2 whitespace-pre-wrap text-xs leading-snug text-muted-foreground">
          {task.description}
        </div>
      )}

      {/* Labels */}
      {taskLabelObjects.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {taskLabelObjects.slice(0, 4).map((l) => (
            <Badge
              key={l.id}
              variant="secondary"
              className="h-5 border-0 px-1.5 text-[10px] font-medium"
              style={{ backgroundColor: hexWithAlpha(l.color, 0.18), color: l.color }}
            >
              {l.name}
            </Badge>
          ))}
          {taskLabelObjects.length > 4 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              +{taskLabelObjects.length - 4}
            </Badge>
          )}
        </div>
      )}

      {/* Meta row */}
      {(due || totalItems > 0 || taskAttachments.length > 0 || taskComments.length > 0 || task.github_repo_url) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {due && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                due.tone === "danger" && "text-rose-400",
                due.tone === "warning" && "text-amber-400",
              )}
            >
              <Calendar className="h-3 w-3" />
              {due.label}
            </span>
          )}
          {totalItems > 0 && (
            <span className="inline-flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              {doneItems}/{totalItems}
            </span>
          )}
          {taskAttachments.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              {taskAttachments.length}
            </span>
          )}
          {taskComments.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {taskComments.length}
            </span>
          )}
          {task.github_repo_url && (
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <Github className="h-3 w-3" />
              repo
            </span>
          )}
        </div>
      )}
    </button>
  )
}
