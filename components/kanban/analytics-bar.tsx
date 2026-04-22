"use client"

import { useMemo } from "react"
import { Package, Rocket, Users, CheckCircle2 } from "lucide-react"
import { useKanban } from "@/lib/kanban-store"
import { IDENTITIES } from "@/lib/identity"

const SHIPPED_COLUMN_NAMES = new Set(["done", "shipped", "completed", "complete"])

export function AnalyticsBar({ projectFilterId }: { projectFilterId: string | null }) {
  const { columns, tasks } = useKanban()

  const stats = useMemo(() => {
    const shippedColumnIds = new Set(
      columns
        .filter((c) => SHIPPED_COLUMN_NAMES.has(c.name.trim().toLowerCase()))
        .map((c) => c.id),
    )
    const backlogColumnIds = new Set(
      columns.filter((c) => c.name.trim().toLowerCase() === "backlog").map((c) => c.id),
    )

    const scoped = tasks.filter((t) => {
      if (!t.column_id) return false
      if (backlogColumnIds.has(t.column_id)) return false
      if (projectFilterId && t.project_id !== projectFilterId) return false
      return true
    })

    const shipped = scoped.filter((t) => shippedColumnIds.has(t.column_id!))
    const inProgress = scoped.length - shipped.length

    const shippedBy: Record<string, number> = {}
    for (const t of shipped) {
      const key = t.created_by || "unknown"
      shippedBy[key] = (shippedBy[key] ?? 0) + 1
    }

    return {
      total: scoped.length,
      shipped: shipped.length,
      inProgress,
      shippedBy,
    }
  }, [columns, tasks, projectFilterId])

  return (
    <footer className="border-t border-border/60 bg-background/80 px-6 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <Counter
          icon={<Rocket className="h-3.5 w-3.5" />}
          label="Shipped"
          value={stats.shipped}
          accent="text-emerald-500"
        />
        <Counter
          icon={<Package className="h-3.5 w-3.5" />}
          label="In progress"
          value={stats.inProgress}
          accent="text-amber-500"
        />
        <Counter
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Total"
          value={stats.total}
          accent="text-muted-foreground"
        />

        <div className="mx-1 hidden h-4 w-px bg-border md:block" />

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span className="font-medium">Shipped by</span>
        </div>
        {Object.values(IDENTITIES).map((ident) => (
          <div
            key={ident.id}
            className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-xs"
          >
            <span
              className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-semibold text-white"
              style={{ backgroundColor: ident.color }}
            >
              {ident.initials}
            </span>
            <span className="font-medium">{ident.name}</span>
            <span className="tabular-nums text-muted-foreground">
              {stats.shippedBy[ident.id] ?? 0}
            </span>
          </div>
        ))}
      </div>
    </footer>
  )
}

function Counter({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: number
  accent: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-1.5">
      <span className={accent}>{icon}</span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  )
}
