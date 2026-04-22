"use client"

import { useKanban } from "@/lib/kanban-store"
import { IDENTITIES, type IdentityId } from "@/lib/identity"
import { formatRelative } from "@/lib/kanban-utils"

function actionText(entry: { action: string; detail: Record<string, unknown> | null }) {
  const d = entry.detail ?? {}
  switch (entry.action) {
    case "created":
      return "created this task"
    case "updated": {
      const keys = Object.keys(d).filter((k) => k !== "updated_at")
      if (keys.length === 0) return "updated this task"
      return `updated ${keys.join(", ")}`
    }
    case "moved":
      return `moved from ${d["from"] ?? "—"} to ${d["to"] ?? "—"}`
    case "commented":
      return "commented"
    case "deleted":
      return "deleted this task"
    default:
      return entry.action
  }
}

export function ActivityPanel({ taskId }: { taskId: string }) {
  const { activity } = useKanban()
  const entries = activity
    .filter((a) => a.task_id === taskId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">No activity yet.</p>
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry) => {
        const known = IDENTITIES[entry.actor as IdentityId]
        const actor = known ?? { name: entry.actor, color: "#64748b", initials: entry.actor.slice(0, 1).toUpperCase() }
        return (
          <li key={entry.id} className="flex items-center gap-2 text-xs">
            <span
              className="flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-semibold text-white"
              style={{ backgroundColor: actor.color }}
            >
              {actor.initials}
            </span>
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{actor.name}</span> {actionText(entry)}{" "}
              <span>· {formatRelative(entry.created_at)}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
