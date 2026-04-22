import type { Priority } from "@/lib/types"

export const PRIORITY_META: Record<Priority, { label: string; dot: string; text: string }> = {
  low: { label: "Low", dot: "bg-slate-400", text: "text-slate-400" },
  medium: { label: "Medium", dot: "bg-sky-400", text: "text-sky-400" },
  high: { label: "High", dot: "bg-amber-400", text: "text-amber-400" },
  urgent: { label: "Urgent", dot: "bg-rose-500", text: "text-rose-400" },
}

export function formatDueDate(iso: string | null | undefined) {
  if (!iso) return null
  const date = new Date(iso)
  const now = new Date()
  const msPerDay = 1000 * 60 * 60 * 24
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = Math.round((startOfDay(date) - startOfDay(now)) / msPerDay)
  const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  if (diff === 0) return { label: "Today", tone: "warning" as const }
  if (diff === 1) return { label: "Tomorrow", tone: "normal" as const }
  if (diff === -1) return { label: "Yesterday", tone: "danger" as const }
  if (diff < 0) return { label, tone: "danger" as const }
  if (diff <= 3) return { label, tone: "warning" as const }
  return { label, tone: "normal" as const }
}

export function formatRelative(iso: string) {
  const date = new Date(iso)
  const diff = Date.now() - date.getTime()
  const s = Math.round(diff / 1000)
  if (s < 60) return "just now"
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d}d ago`
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function hexWithAlpha(hex: string, alpha: number) {
  const h = hex.replace("#", "")
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h
  const r = Number.parseInt(full.slice(0, 2), 16)
  const g = Number.parseInt(full.slice(2, 4), 16)
  const b = Number.parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
