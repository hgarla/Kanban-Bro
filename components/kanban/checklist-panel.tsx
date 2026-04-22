"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { useKanban } from "@/lib/kanban-store"
import { cn } from "@/lib/utils"

export function ChecklistPanel({ taskId }: { taskId: string }) {
  const { checklist, addChecklistItem, toggleChecklistItem, deleteChecklistItem } = useKanban()
  const items = checklist.filter((c) => c.task_id === taskId).sort((a, b) => a.position - b.position)
  const done = items.filter((i) => i.done).length
  const total = items.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const [newItem, setNewItem] = useState("")

  async function handleAdd() {
    const v = newItem.trim()
    if (!v) return
    await addChecklistItem(taskId, v)
    setNewItem("")
  }

  return (
    <div className="space-y-2">
      {total > 0 && (
        <div className="flex items-center gap-3">
          <Progress value={pct} className="h-1.5 flex-1" />
          <span className="text-xs font-medium text-muted-foreground">
            {done}/{total}
          </span>
        </div>
      )}
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.id} className="group flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent/30">
            <Checkbox
              checked={it.done}
              onCheckedChange={(v) => toggleChecklistItem(it.id, Boolean(v))}
              className="flex-none"
            />
            <span
              className={cn(
                "flex-1 text-sm",
                it.done && "text-muted-foreground line-through decoration-muted-foreground/60",
              )}
            >
              {it.content}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={() => deleteChecklistItem(it.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="sr-only">Delete</span>
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 pt-1">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd()
          }}
          placeholder="Add a checklist item..."
          className="h-8 text-sm"
        />
        <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={handleAdd}>
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  )
}
