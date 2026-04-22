"use client"

import { useEffect, useState } from "react"
import { Calendar as CalendarIcon, Check, Github, Tag, Trash2, X } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Markdown } from "./markdown"
import { ChecklistPanel } from "./checklist-panel"
import { AttachmentsPanel } from "./attachments-panel"
import { CommentsPanel } from "./comments-panel"
import { ActivityPanel } from "./activity-panel"
import { useKanban } from "@/lib/kanban-store"
import { useIdentity, IDENTITIES, type IdentityId } from "@/lib/identity"
import { PRIORITY_META, formatRelative, hexWithAlpha } from "@/lib/kanban-utils"
import type { Priority } from "@/lib/types"
import { cn } from "@/lib/utils"

export function TaskDialog({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const {
    tasks,
    columns,
    labels,
    projects,
    taskLabels,
    updateTask,
    deleteTask,
    setTaskLabel,
    moveTask,
  } = useKanban()
  const { identity } = useIdentity()

  const task = taskId ? tasks.find((t) => t.id === taskId) : null

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [editingDesc, setEditingDesc] = useState(false)
  const [repoUrl, setRepoUrl] = useState("")
  const [editingRepo, setEditingRepo] = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description)
      setRepoUrl(task.github_repo_url ?? "")
      setEditingDesc(false)
      setEditingRepo(false)
    }
  }, [task?.id])

  if (!task) {
    return (
      <Dialog open={false} onOpenChange={(o) => !o && onClose()}>
        <DialogContent />
      </Dialog>
    )
  }

  const t = task
  const activeLabelIds = new Set(taskLabels.filter((l) => l.task_id === t.id).map((l) => l.label_id))
  const activeLabels = labels.filter((l) => activeLabelIds.has(l.id))
  const currentColumn = columns.find((c) => c.id === t.column_id)
  const currentProject = projects.find((p) => p.id === t.project_id)
  const actor = identity?.id ?? "me"
  const creator = IDENTITIES[t.created_by as IdentityId]

  async function saveTitle() {
    const v = title.trim()
    if (!v || v === t.title) {
      setTitle(t.title)
      return
    }
    await updateTask(t.id, { title: v }, actor)
  }

  async function saveDescription() {
    if (description === t.description) {
      setEditingDesc(false)
      return
    }
    await updateTask(t.id, { description }, actor)
    setEditingDesc(false)
  }

  async function saveRepoUrl() {
    const v = repoUrl.trim()
    if (v === (t.github_repo_url ?? "")) {
      setEditingRepo(false)
      return
    }
    await updateTask(t.id, { github_repo_url: v || null }, actor)
    setEditingRepo(false)
  }

  async function handleChangeColumn(newColumnId: string) {
    if (newColumnId === t.column_id) return
    // Put at the end of the new column
    const destTasks = tasks.filter((x) => x.column_id === newColumnId)
    await moveTask(t.id, newColumnId, destTasks.length, actor)
  }

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="flex max-h-[90vh] w-[95vw] max-w-4xl flex-col gap-0 overflow-hidden p-0"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/60 p-5">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Select value={task.column_id ?? undefined} onValueChange={handleChangeColumn}>
                <SelectTrigger className="h-7 w-auto gap-1.5 border-none bg-accent/40 px-2 text-xs hover:bg-accent/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns
                    .slice()
                    .sort((a, b) => a.position - b.position)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Separator orientation="vertical" className="h-4" />
              <ProjectPicker
                value={task.project_id}
                onChange={(id) => updateTask(task.id, { project_id: id }, actor)}
              />
            </div>

            <DialogTitle className="sr-only">{task.title}</DialogTitle>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
              aria-label="Task title"
              className="h-auto border-none bg-transparent p-0 text-xl font-semibold shadow-none focus-visible:ring-0"
            />

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              {creator && <span>Created by {creator.name}</span>}
              <span>·</span>
              <span>{formatRelative(task.created_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete task</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the task and everything attached to it — checklist, attachments,
                    comments, and activity.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      await deleteTask(task.id, actor)
                      onClose()
                    }}
                  >
                    Delete task
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="scrollbar-subtle grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-[1fr_240px]">
          {/* Left column */}
          <div className="scrollbar-subtle min-h-0 overflow-y-auto p-5">
            {/* Active labels inline */}
            {activeLabels.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {activeLabels.map((l) => (
                  <Badge
                    key={l.id}
                    variant="secondary"
                    className="border-0"
                    style={{ backgroundColor: hexWithAlpha(l.color, 0.18), color: l.color }}
                  >
                    {l.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Description */}
            <section className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</h3>
                {!editingDesc && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingDesc(true)}>
                    Edit
                  </Button>
                )}
              </div>
              {editingDesc ? (
                <div className="space-y-2">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe this task... (markdown supported)"
                    className="min-h-[160px] resize-y text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={saveDescription}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDescription(task.description)
                        setEditingDesc(false)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingDesc(true)}
                  className="w-full rounded-lg border border-transparent bg-muted/30 px-3 py-2 text-left transition-colors hover:border-border/60 hover:bg-muted/50"
                >
                  <Markdown>{task.description}</Markdown>
                </button>
              )}
            </section>

            {/* Repo URL */}
            <section className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Github className="h-3.5 w-3.5" />
                  GitHub repository
                </h3>
                {!editingRepo && task.github_repo_url && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingRepo(true)}>
                    Edit
                  </Button>
                )}
              </div>
              {editingRepo ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/user/repo"
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Button size="sm" className="h-8" onClick={saveRepoUrl}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => {
                      setRepoUrl(task.github_repo_url ?? "")
                      setEditingRepo(false)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : task.github_repo_url ? (
                <a
                  href={task.github_repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-400 hover:bg-emerald-500/15"
                >
                  <Github className="h-3.5 w-3.5" />
                  <span className="truncate">{task.github_repo_url.replace(/^https?:\/\//, "")}</span>
                </a>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setEditingRepo(true)}
                >
                  <Github className="h-3.5 w-3.5" />
                  Add repo link
                </Button>
              )}
            </section>

            {/* Checklist */}
            <section className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checklist</h3>
              <ChecklistPanel taskId={task.id} />
            </section>

            {/* Attachments */}
            <section className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attachments</h3>
              <AttachmentsPanel taskId={task.id} />
            </section>

            {/* Comments & activity */}
            <section>
              <Tabs defaultValue="comments">
                <TabsList className="h-8">
                  <TabsTrigger value="comments" className="text-xs">
                    Comments
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs">
                    Activity
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="comments" className="pt-4">
                  <CommentsPanel taskId={task.id} />
                </TabsContent>
                <TabsContent value="activity" className="pt-4">
                  <ActivityPanel taskId={task.id} />
                </TabsContent>
              </Tabs>
            </section>
          </div>

          {/* Right sidebar */}
          <aside className="scrollbar-subtle border-t border-border/60 bg-sidebar/40 p-4 md:border-l md:border-t-0">
            <div className="space-y-5">
              <SidebarSection label="Priority">
                <Select
                  value={task.priority}
                  onValueChange={(v) => updateTask(task.id, { priority: v as Priority }, actor)}
                >
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRIORITY_META) as Priority[]).map((p) => {
                      const meta = PRIORITY_META[p]
                      return (
                        <SelectItem key={p} value={p} className="text-xs">
                          <span className="flex items-center gap-2">
                            <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                            {meta.label}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </SidebarSection>

              <SidebarSection label="Due date">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-full justify-start gap-2 text-xs font-normal"
                    >
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {task.due_date
                        ? new Date(task.due_date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Set due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={task.due_date ? new Date(task.due_date) : undefined}
                      onSelect={(d) =>
                        updateTask(task.id, { due_date: d ? d.toISOString() : null }, actor)
                      }
                      autoFocus
                    />
                    {task.due_date && (
                      <div className="border-t border-border/60 p-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full text-xs"
                          onClick={() => updateTask(task.id, { due_date: null }, actor)}
                        >
                          Clear due date
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </SidebarSection>

              <SidebarSection label="Labels">
                <LabelPicker
                  activeIds={activeLabelIds}
                  onToggle={(labelId, on) => setTaskLabel(task.id, labelId, on)}
                />
              </SidebarSection>

              {currentColumn && (
                <div className="text-[11px] text-muted-foreground">
                  <span className="opacity-60">In column</span>{" "}
                  <span className="font-medium text-foreground">{currentColumn.name}</span>
                  {currentProject && (
                    <>
                      {" · "}
                      <span className="font-medium" style={{ color: currentProject.color }}>
                        {currentProject.name}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SidebarSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      {children}
    </div>
  )
}

function ProjectPicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (id: string | null) => void
}) {
  const { projects } = useKanban()
  const current = projects.find((p) => p.id === value)
  return (
    <Select
      value={value ?? "none"}
      onValueChange={(v) => onChange(v === "none" ? null : v)}
    >
      <SelectTrigger
        className="h-7 w-auto gap-1.5 border-none bg-accent/40 px-2 text-xs hover:bg-accent/60"
        aria-label="Project"
      >
        {current ? (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: current.color }} />
            {current.name}
          </span>
        ) : (
          <span className="text-muted-foreground">No project</span>
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none" className="text-xs">
          No project
        </SelectItem>
        {projects.map((p) => (
          <SelectItem key={p.id} value={p.id} className="text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function LabelPicker({
  activeIds,
  onToggle,
}: {
  activeIds: Set<string>
  onToggle: (labelId: string, on: boolean) => void
}) {
  const { labels, addLabel } = useKanban()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState("#6366f1")

  const palette = ["#6366f1", "#10b981", "#ef4444", "#f59e0b", "#ec4899", "#64748b", "#06b6d4", "#a855f7"]

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    const created = await addLabel(name, newColor)
    if (created) {
      onToggle(created.id, true)
    }
    setNewName("")
    setCreating(false)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-full justify-start gap-2 text-xs font-normal">
          <Tag className="h-3.5 w-3.5" />
          {activeIds.size > 0 ? `${activeIds.size} label${activeIds.size > 1 ? "s" : ""}` : "Add labels"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-2">
        <div className="space-y-1">
          {labels.map((l) => {
            const active = activeIds.has(l.id)
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => onToggle(l.id, !active)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent/40"
              >
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                <span className="flex-1 text-left">{l.name}</span>
                {active && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            )
          })}
          {labels.length === 0 && (
            <p className="px-2 py-2 text-xs text-muted-foreground">No labels yet.</p>
          )}
        </div>
        <Separator className="my-2" />
        {creating ? (
          <div className="space-y-2">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Label name"
              className="h-7 text-xs"
            />
            <div className="flex flex-wrap gap-1.5">
              {palette.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={cn(
                    "h-5 w-5 rounded border border-border/60 transition-transform",
                    newColor === c && "scale-110 ring-2 ring-primary ring-offset-1 ring-offset-background",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 flex-1 text-xs" onClick={handleCreate}>
                Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => {
                  setCreating(false)
                  setNewName("")
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="h-7 w-full text-xs" onClick={() => setCreating(true)}>
            + New label
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
