"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Markdown } from "./markdown"
import { useKanban } from "@/lib/kanban-store"
import { IDENTITIES, useIdentity, type IdentityId } from "@/lib/identity"
import { formatRelative } from "@/lib/kanban-utils"

export function CommentsPanel({ taskId }: { taskId: string }) {
  const { comments, addComment, deleteComment } = useKanban()
  const { identity } = useIdentity()
  const [body, setBody] = useState("")

  const list = comments
    .filter((c) => c.task_id === taskId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  async function handleSubmit() {
    const v = body.trim()
    if (!v || !identity) return
    await addComment(taskId, identity.id, v)
    setBody("")
  }

  function authorInfo(author: string) {
    const known = IDENTITIES[author as IdentityId]
    return known ?? { name: author, color: "#64748b", initials: author.slice(0, 1).toUpperCase(), id: author }
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {list.map((c) => {
          const author = authorInfo(c.author)
          return (
            <li key={c.id} className="group flex gap-2.5">
              <span
                className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: author.color }}
              >
                {author.initials}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-foreground">{author.name}</span>
                  <span className="text-muted-foreground">{formatRelative(c.created_at)}</span>
                </div>
                <div className="mt-1 rounded-lg border border-border/60 bg-card/60 px-3 py-2">
                  <Markdown>{c.body}</Markdown>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={() => deleteComment(c.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Delete</span>
              </Button>
            </li>
          )
        })}
        {list.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
      </ul>

      <div className="flex gap-2">
        <span
          className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: identity?.color }}
        >
          {identity?.initials}
        </span>
        <div className="flex-1 space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a comment... (markdown supported)"
            className="min-h-[80px] resize-y text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Tip: <kbd className="rounded bg-muted px-1 text-[10px]">Cmd/Ctrl</kbd> +{" "}
              <kbd className="rounded bg-muted px-1 text-[10px]">Enter</kbd> to send
            </span>
            <Button size="sm" onClick={handleSubmit} disabled={!body.trim()}>
              Comment
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
