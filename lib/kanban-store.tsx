"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type {
  ActivityEntry,
  Attachment,
  ChecklistItem,
  Column,
  Comment,
  Label,
  Priority,
  Project,
  Task,
} from "@/lib/types"

type StoreState = {
  ready: boolean
  projects: Project[]
  columns: Column[]
  labels: Label[]
  tasks: Task[]
  taskLabels: { task_id: string; label_id: string }[]
  checklist: ChecklistItem[]
  attachments: Attachment[]
  comments: Comment[]
  activity: ActivityEntry[]
}

type StoreActions = {
  // Projects
  addProject: (name: string, color: string) => Promise<Project | null>
  updateProject: (id: string, patch: Partial<Pick<Project, "name" | "color">>) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  // Columns
  addColumn: (name: string) => Promise<void>
  renameColumn: (id: string, name: string) => Promise<void>
  deleteColumn: (id: string) => Promise<void>
  reorderColumns: (orderedIds: string[]) => Promise<void>

  // Labels
  addLabel: (name: string, color: string) => Promise<Label | null>
  deleteLabel: (id: string) => Promise<void>

  // Tasks
  createTask: (input: {
    title: string
    columnId: string
    projectId: string | null
    actor: string
  }) => Promise<Task | null>
  updateTask: (
    id: string,
    patch: Partial<
      Pick<
        Task,
        | "title"
        | "description"
        | "priority"
        | "due_date"
        | "github_repo_url"
        | "project_id"
      >
    >,
    actor?: string,
  ) => Promise<void>
  moveTask: (
    taskId: string,
    toColumnId: string,
    toIndex: number,
    actor: string,
  ) => Promise<void>
  deleteTask: (id: string, actor: string) => Promise<void>

  // Task labels
  setTaskLabel: (taskId: string, labelId: string, on: boolean) => Promise<void>

  // Checklist
  addChecklistItem: (taskId: string, content: string) => Promise<void>
  toggleChecklistItem: (id: string, done: boolean) => Promise<void>
  deleteChecklistItem: (id: string) => Promise<void>

  // Attachments
  addAttachment: (a: Omit<Attachment, "id" | "created_at">) => Promise<void>
  deleteAttachment: (id: string) => Promise<void>

  // Comments
  addComment: (taskId: string, author: string, body: string) => Promise<void>
  deleteComment: (id: string) => Promise<void>
}

type StoreCtx = StoreState & StoreActions

const KanbanContext = createContext<StoreCtx | null>(null)

export function KanbanProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), [])

  const [state, setState] = useState<StoreState>({
    ready: false,
    projects: [],
    columns: [],
    labels: [],
    tasks: [],
    taskLabels: [],
    checklist: [],
    attachments: [],
    comments: [],
    activity: [],
  })

  // Use a ref for state inside realtime callbacks
  const stateRef = useRef(state)
  stateRef.current = state

  // ----- initial load -----
  useEffect(() => {
    let cancelled = false
    async function load() {
      const [projects, columns, labels, tasks, taskLabels, checklist, attachments, comments, activity] =
        await Promise.all([
          supabase.from("projects").select("*").order("created_at", { ascending: true }),
          supabase.from("columns").select("*").order("position", { ascending: true }),
          supabase.from("labels").select("*").order("name", { ascending: true }),
          supabase.from("tasks").select("*").order("position", { ascending: true }),
          supabase.from("task_labels").select("*"),
          supabase.from("checklist_items").select("*").order("position", { ascending: true }),
          supabase.from("attachments").select("*").order("created_at", { ascending: true }),
          supabase.from("comments").select("*").order("created_at", { ascending: true }),
          supabase.from("activity").select("*").order("created_at", { ascending: false }).limit(500),
        ])

      if (cancelled) return
      setState({
        ready: true,
        projects: (projects.data ?? []) as Project[],
        columns: (columns.data ?? []) as Column[],
        labels: (labels.data ?? []) as Label[],
        tasks: (tasks.data ?? []) as Task[],
        taskLabels: (taskLabels.data ?? []) as { task_id: string; label_id: string }[],
        checklist: (checklist.data ?? []) as ChecklistItem[],
        attachments: (attachments.data ?? []) as Attachment[],
        comments: (comments.data ?? []) as Comment[],
        activity: (activity.data ?? []) as ActivityEntry[],
      })
    }
    load()
    return () => {
      cancelled = true
    }
  }, [supabase])

  // ----- realtime subscriptions -----
  useEffect(() => {
    const channel = supabase.channel("kanban-all")

    function applyChange<T extends { id: string }>(
      key: keyof StoreState,
      event: "INSERT" | "UPDATE" | "DELETE",
      row: T,
      oldRow?: { id: string },
    ) {
      setState((prev) => {
        const current = prev[key] as unknown as T[]
        let next: T[]
        if (event === "INSERT") {
          if (current.some((r) => r.id === row.id)) return prev
          next = [...current, row]
        } else if (event === "UPDATE") {
          next = current.map((r) => (r.id === row.id ? row : r))
        } else {
          const id = oldRow?.id ?? row.id
          next = current.filter((r) => r.id !== id)
        }
        return { ...prev, [key]: next } as StoreState
      })
    }

    function applyLinkChange(
      event: "INSERT" | "DELETE",
      row: { task_id: string; label_id: string },
    ) {
      setState((prev) => {
        if (event === "INSERT") {
          if (
            prev.taskLabels.some(
              (l) => l.task_id === row.task_id && l.label_id === row.label_id,
            )
          )
            return prev
          return { ...prev, taskLabels: [...prev.taskLabels, row] }
        }
        return {
          ...prev,
          taskLabels: prev.taskLabels.filter(
            (l) => !(l.task_id === row.task_id && l.label_id === row.label_id),
          ),
        }
      })
    }

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        (payload: any) => applyChange("projects", payload.eventType, payload.new, payload.old),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "columns" },
        (payload: any) => applyChange("columns", payload.eventType, payload.new, payload.old),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "labels" },
        (payload: any) => applyChange("labels", payload.eventType, payload.new, payload.old),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload: any) => applyChange("tasks", payload.eventType, payload.new, payload.old),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_labels" },
        (payload: any) => {
          if (payload.eventType === "INSERT") applyLinkChange("INSERT", payload.new)
          else if (payload.eventType === "DELETE") applyLinkChange("DELETE", payload.old)
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checklist_items" },
        (payload: any) => applyChange("checklist", payload.eventType, payload.new, payload.old),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attachments" },
        (payload: any) => applyChange("attachments", payload.eventType, payload.new, payload.old),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments" },
        (payload: any) => applyChange("comments", payload.eventType, payload.new, payload.old),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity" },
        (payload: any) => applyChange("activity", payload.eventType, payload.new, payload.old),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // ---------- helpers ----------
  async function logActivity(taskId: string, actor: string, action: string, detail?: Record<string, unknown>) {
    await supabase.from("activity").insert({ task_id: taskId, actor, action, detail: detail ?? null })
  }

  // ---------- actions ----------
  const addProject: StoreActions["addProject"] = useCallback(
    async (name, color) => {
      const { data } = await supabase.from("projects").insert({ name, color }).select("*").single()
      return (data as Project) ?? null
    },
    [supabase],
  )

  const updateProject: StoreActions["updateProject"] = useCallback(
    async (id, patch) => {
      await supabase.from("projects").update(patch).eq("id", id)
    },
    [supabase],
  )

  const deleteProject: StoreActions["deleteProject"] = useCallback(
    async (id) => {
      await supabase.from("projects").delete().eq("id", id)
    },
    [supabase],
  )

  const addColumn: StoreActions["addColumn"] = useCallback(
    async (name) => {
      const maxPos = stateRef.current.columns.reduce((m, c) => Math.max(m, c.position), -1)
      await supabase.from("columns").insert({ name, position: maxPos + 1 })
    },
    [supabase],
  )

  const renameColumn: StoreActions["renameColumn"] = useCallback(
    async (id, name) => {
      await supabase.from("columns").update({ name }).eq("id", id)
    },
    [supabase],
  )

  const deleteColumn: StoreActions["deleteColumn"] = useCallback(
    async (id) => {
      await supabase.from("columns").delete().eq("id", id)
    },
    [supabase],
  )

  const reorderColumns: StoreActions["reorderColumns"] = useCallback(
    async (orderedIds) => {
      // Optimistic
      setState((prev) => ({
        ...prev,
        columns: prev.columns
          .map((c) => ({ ...c, position: orderedIds.indexOf(c.id) }))
          .sort((a, b) => a.position - b.position),
      }))
      await Promise.all(
        orderedIds.map((id, position) => supabase.from("columns").update({ position }).eq("id", id)),
      )
    },
    [supabase],
  )

  const addLabel: StoreActions["addLabel"] = useCallback(
    async (name, color) => {
      const { data } = await supabase.from("labels").insert({ name, color }).select("*").single()
      return (data as Label) ?? null
    },
    [supabase],
  )

  const deleteLabel: StoreActions["deleteLabel"] = useCallback(
    async (id) => {
      await supabase.from("labels").delete().eq("id", id)
    },
    [supabase],
  )

  const createTask: StoreActions["createTask"] = useCallback(
    async ({ title, columnId, projectId, actor }) => {
      const tasksInCol = stateRef.current.tasks.filter((t) => t.column_id === columnId)
      const maxPos = tasksInCol.reduce((m, t) => Math.max(m, t.position), -1)
      const { data } = await supabase
        .from("tasks")
        .insert({
          title,
          column_id: columnId,
          project_id: projectId,
          position: maxPos + 1,
          created_by: actor,
          priority: "medium" as Priority,
        })
        .select("*")
        .single()
      if (data) {
        await logActivity(data.id, actor, "created", { title })
      }
      return (data as Task) ?? null
    },
    [supabase],
  )

  const updateTask: StoreActions["updateTask"] = useCallback(
    async (id, patch, actor = "me") => {
      await supabase
        .from("tasks")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id)
      await logActivity(id, actor, "updated", patch as Record<string, unknown>)
    },
    [supabase],
  )

  const moveTask: StoreActions["moveTask"] = useCallback(
    async (taskId, toColumnId, toIndex, actor) => {
      const prev = stateRef.current
      const moved = prev.tasks.find((t) => t.id === taskId)
      if (!moved) return
      const fromColumnId = moved.column_id

      // Compute new ordering per column
      const fromTasks = prev.tasks
        .filter((t) => t.column_id === fromColumnId && t.id !== taskId)
        .sort((a, b) => a.position - b.position)
      const toTasksBase = prev.tasks
        .filter((t) => t.column_id === toColumnId && t.id !== taskId)
        .sort((a, b) => a.position - b.position)

      const clamped = Math.max(0, Math.min(toIndex, toTasksBase.length))
      const updatedMoved: Task = { ...moved, column_id: toColumnId, position: clamped }
      const toTasksNext = [...toTasksBase.slice(0, clamped), updatedMoved, ...toTasksBase.slice(clamped)]

      const fromPatches = fromTasks.map((t, i) => ({ id: t.id, position: i }))
      const toPatches = toTasksNext.map((t, i) => ({ id: t.id, position: i, column_id: toColumnId }))

      // Optimistic update
      setState((s) => {
        const byId = new Map(s.tasks.map((t) => [t.id, t]))
        fromPatches.forEach((p) => {
          const cur = byId.get(p.id)
          if (cur) byId.set(p.id, { ...cur, position: p.position })
        })
        toPatches.forEach((p) => {
          const cur = byId.get(p.id)
          if (cur) byId.set(p.id, { ...cur, position: p.position, column_id: p.column_id })
        })
        return { ...s, tasks: Array.from(byId.values()) }
      })

      // Persist
      await Promise.all([
        ...fromPatches.map((p) =>
          supabase.from("tasks").update({ position: p.position }).eq("id", p.id),
        ),
        ...toPatches.map((p) =>
          supabase
            .from("tasks")
            .update({ position: p.position, column_id: p.column_id })
            .eq("id", p.id),
        ),
      ])

      if (fromColumnId !== toColumnId) {
        const toCol = prev.columns.find((c) => c.id === toColumnId)?.name
        const fromCol = prev.columns.find((c) => c.id === fromColumnId)?.name
        await logActivity(taskId, actor, "moved", { from: fromCol, to: toCol })
      }
    },
    [supabase],
  )

  const deleteTask: StoreActions["deleteTask"] = useCallback(
    async (id, actor) => {
      await logActivity(id, actor, "deleted")
      await supabase.from("tasks").delete().eq("id", id)
    },
    [supabase],
  )

  const setTaskLabel: StoreActions["setTaskLabel"] = useCallback(
    async (taskId, labelId, on) => {
      if (on) {
        await supabase.from("task_labels").insert({ task_id: taskId, label_id: labelId })
      } else {
        await supabase.from("task_labels").delete().eq("task_id", taskId).eq("label_id", labelId)
      }
    },
    [supabase],
  )

  const addChecklistItem: StoreActions["addChecklistItem"] = useCallback(
    async (taskId, content) => {
      const items = stateRef.current.checklist.filter((c) => c.task_id === taskId)
      const maxPos = items.reduce((m, c) => Math.max(m, c.position), -1)
      await supabase.from("checklist_items").insert({ task_id: taskId, content, position: maxPos + 1 })
    },
    [supabase],
  )

  const toggleChecklistItem: StoreActions["toggleChecklistItem"] = useCallback(
    async (id, done) => {
      await supabase.from("checklist_items").update({ done }).eq("id", id)
    },
    [supabase],
  )

  const deleteChecklistItem: StoreActions["deleteChecklistItem"] = useCallback(
    async (id) => {
      await supabase.from("checklist_items").delete().eq("id", id)
    },
    [supabase],
  )

  const addAttachment: StoreActions["addAttachment"] = useCallback(
    async (a) => {
      await supabase.from("attachments").insert(a)
    },
    [supabase],
  )

  const deleteAttachment: StoreActions["deleteAttachment"] = useCallback(
    async (id) => {
      await supabase.from("attachments").delete().eq("id", id)
    },
    [supabase],
  )

  const addComment: StoreActions["addComment"] = useCallback(
    async (taskId, author, body) => {
      await supabase.from("comments").insert({ task_id: taskId, author, body })
      await logActivity(taskId, author, "commented")
    },
    [supabase],
  )

  const deleteComment: StoreActions["deleteComment"] = useCallback(
    async (id) => {
      await supabase.from("comments").delete().eq("id", id)
    },
    [supabase],
  )

  const value: StoreCtx = {
    ...state,
    addProject,
    updateProject,
    deleteProject,
    addColumn,
    renameColumn,
    deleteColumn,
    reorderColumns,
    addLabel,
    deleteLabel,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
    setTaskLabel,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    addAttachment,
    deleteAttachment,
    addComment,
    deleteComment,
  }

  return <KanbanContext.Provider value={value}>{children}</KanbanContext.Provider>
}

export function useKanban() {
  const ctx = useContext(KanbanContext)
  if (!ctx) throw new Error("useKanban must be used inside KanbanProvider")
  return ctx
}
