"use client"

import { useMemo, useRef, useState } from "react"
import { ExternalLink, File, Image as ImageIcon, Link2, Loader2, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useKanban } from "@/lib/kanban-store"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Attachment } from "@/lib/types"

function fileIcon(mime: string | null) {
  if (mime?.startsWith("image/")) return ImageIcon
  return File
}

function humanSize(bytes: number | null) {
  if (!bytes) return ""
  const units = ["B", "KB", "MB", "GB"]
  let v = bytes
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

export function AttachmentsPanel({ taskId }: { taskId: string }) {
  const { attachments, addAttachment, deleteAttachment } = useKanban()
  const supabase = useMemo(() => createClient(), [])
  const [uploading, setUploading] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [linkName, setLinkName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const list = attachments.filter((a) => a.task_id === taskId)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const safeName = file.name.replace(/[^\w.\-]+/g, "_")
        const path = `tasks/${taskId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`
        const { error } = await supabase.storage
          .from("attachments")
          .upload(path, file, {
            cacheControl: "3600",
            contentType: file.type || undefined,
            upsert: false,
          })
        if (error) {
          console.error("[upload] supabase storage error:", error)
          toast.error(`Failed to upload ${file.name}`)
          continue
        }
        const { data: pub } = supabase.storage.from("attachments").getPublicUrl(path)
        await addAttachment({
          task_id: taskId,
          kind: "upload",
          name: file.name,
          url: pub.publicUrl,
          mime_type: file.type || null,
          size_bytes: file.size ?? null,
        })
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleAddLink() {
    const url = linkUrl.trim()
    if (!url) return
    const name = linkName.trim() || new URL(url.startsWith("http") ? url : `https://${url}`).hostname
    await addAttachment({
      task_id: taskId,
      kind: "link",
      name,
      url: url.startsWith("http") ? url : `https://${url}`,
      mime_type: null,
      size_bytes: null,
    })
    setLinkUrl("")
    setLinkName("")
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Upload files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Link2 className="h-3.5 w-3.5" />
          Add external link
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://drive.google.com/..."
            className="h-8 text-xs"
          />
          <Button size="sm" className="h-8 text-xs" onClick={handleAddLink}>
            Add
          </Button>
        </div>
        <Input
          value={linkName}
          onChange={(e) => setLinkName(e.target.value)}
          placeholder="Name (optional)"
          className="h-8 text-xs"
        />
      </div>

      {list.length > 0 ? (
        <ul className="space-y-1.5">
          {list.map((a) => (
            <AttachmentRow key={a.id} attachment={a} onDelete={() => deleteAttachment(a.id)} />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No attachments yet.</p>
      )}
    </div>
  )
}

function AttachmentRow({ attachment, onDelete }: { attachment: Attachment; onDelete: () => void }) {
  const Icon = attachment.kind === "link" ? ExternalLink : fileIcon(attachment.mime_type)
  const isImage = attachment.kind === "upload" && attachment.mime_type?.startsWith("image/")

  return (
    <li className="group flex items-center gap-2 rounded-md border border-border/50 bg-card/60 p-2 text-xs">
      {isImage ? (
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 w-10 flex-none overflow-hidden rounded border border-border/60 bg-muted"
        >
          <img
            src={attachment.url || "/placeholder.svg"}
            alt={attachment.name}
            className="h-full w-full object-cover"
          />
        </a>
      ) : (
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded border border-border/60 bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate font-medium text-foreground hover:underline"
        >
          {attachment.name}
        </a>
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          <span>{attachment.kind === "link" ? "Link" : "File"}</span>
          {attachment.size_bytes ? <span>{humanSize(attachment.size_bytes)}</span> : null}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span className="sr-only">Delete attachment</span>
      </Button>
    </li>
  )
}
