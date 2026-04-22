"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { Check, LayoutGrid, Moon, MoreHorizontal, Pencil, Plus, Sun, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useKanban } from "@/lib/kanban-store"
import { IDENTITIES, useIdentity } from "@/lib/identity"
import { cn } from "@/lib/utils"
import type { Project } from "@/lib/types"
import { toast } from "sonner"

export function TopBar({
  projectFilterId,
  onProjectFilterChange,
}: {
  projectFilterId: string | null
  onProjectFilterChange: (id: string | null) => void
}) {
  const { projects, tasks, addProject, updateProject, deleteProject } = useKanban()
  const { identity, setIdentity } = useIdentity()
  const { theme, setTheme, resolvedTheme } = useTheme()

  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectColor, setNewProjectColor] = useState("#6366f1")
  const [createOpen, setCreateOpen] = useState(false)

  const palette = ["#6366f1", "#10b981", "#ef4444", "#f59e0b", "#ec4899", "#06b6d4", "#a855f7", "#64748b"]
  const activeProject = projects.find((p) => p.id === projectFilterId)

  async function handleCreateProject() {
    const name = newProjectName.trim()
    if (!name) return
    const created = await addProject(name, newProjectColor)
    if (created) {
      onProjectFilterChange(created.id)
      setNewProjectName("")
      setCreateOpen(false)
    }
  }

  async function handleDeleteProject(project: Project) {
    const count = tasks.filter((t) => t.project_id === project.id).length
    if (count > 0) {
      toast.error(`${count} task${count > 1 ? "s" : ""} still tagged with this project.`)
      return
    }
    await deleteProject(project.id)
    if (projectFilterId === project.id) onProjectFilterChange(null)
  }

  const isDark = (resolvedTheme ?? theme) === "dark"

  return (
    <header className="flex items-center gap-3 border-b border-border/60 bg-background/80 px-6 py-3 backdrop-blur">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
          <LayoutGrid className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Flow</span>
      </div>

      <div className="mx-2 hidden h-5 w-px bg-border md:block" />

      {/* Project filter chips */}
      <div className="scrollbar-subtle flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onProjectFilterChange(null)}
          className={cn(
            "h-7 flex-none rounded-full px-3 text-xs font-medium",
            projectFilterId === null ? "bg-accent text-accent-foreground" : "text-muted-foreground",
          )}
        >
          All projects
        </Button>
        {projects.map((p) => (
          <div key={p.id} className="group relative flex-none">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onProjectFilterChange(p.id)}
              className={cn(
                "h-7 gap-1.5 rounded-full px-3 text-xs font-medium",
                projectFilterId === p.id ? "bg-accent text-accent-foreground" : "text-muted-foreground",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -right-1 top-1/2 h-6 w-6 -translate-y-1/2 opacity-0 focus:opacity-100 group-hover:opacity-100"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                  <span className="sr-only">Project actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    const name = window.prompt("Rename project", p.name)
                    if (name && name.trim() && name !== p.name) {
                      updateProject(p.id, { name: name.trim() })
                    }
                  }}
                >
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Rename
                </DropdownMenuItem>
                <ColorSubmenu project={p} onPick={(color) => updateProject(p.id, { color })} palette={palette} />
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleDeleteProject(p)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}

        <Popover open={createOpen} onOpenChange={setCreateOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 flex-none gap-1 rounded-full px-2 text-xs text-muted-foreground">
              <Plus className="h-3.5 w-3.5" />
              New project
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64">
            <div className="space-y-3">
              <div className="text-xs font-semibold">Create project</div>
              <Input
                autoFocus
                placeholder="Project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateProject()
                }}
                className="h-8"
              />
              <div className="flex flex-wrap gap-1.5">
                {palette.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewProjectColor(c)}
                    className={cn(
                      "h-6 w-6 rounded-md border border-border/60 transition-transform",
                      newProjectColor === c && "scale-110 ring-2 ring-primary ring-offset-1 ring-offset-background",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <Button size="sm" className="w-full" onClick={handleCreateProject}>
                Create
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Right-side controls */}
      <div className="flex flex-none items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-2 pl-1.5 pr-2">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: identity?.color }}
              >
                {identity?.initials}
              </span>
              <span className="hidden text-xs font-medium sm:inline">{identity?.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Signed in as
            </div>
            {Object.values(IDENTITIES).map((ident) => (
              <DropdownMenuItem key={ident.id} onClick={() => setIdentity(ident.id)}>
                <span
                  className="mr-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: ident.color }}
                >
                  {ident.initials}
                </span>
                <span className="flex-1">{ident.name}</span>
                {identity?.id === ident.id && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {activeProject && (
        <div className="sr-only" aria-live="polite">
          Viewing project {activeProject.name}
        </div>
      )}
    </header>
  )
}

function ColorSubmenu({
  project,
  palette,
  onPick,
}: {
  project: Project
  palette: string[]
  onPick: (color: string) => void
}) {
  return (
    <div className="px-2 py-1.5">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Color</div>
      <div className="flex flex-wrap gap-1">
        {palette.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onPick(c)}
            className={cn(
              "h-5 w-5 rounded-md border border-border/60",
              project.color === c && "ring-2 ring-primary ring-offset-1 ring-offset-popover",
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  )
}
