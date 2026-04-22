export type Priority = "low" | "medium" | "high" | "urgent"

export type Project = {
  id: string
  name: string
  color: string
  created_at: string
}

export type Column = {
  id: string
  name: string
  position: number
  created_at: string
}

export type Label = {
  id: string
  name: string
  color: string
}

export type ChecklistItem = {
  id: string
  task_id: string
  content: string
  done: boolean
  position: number
  created_at: string
}

export type Attachment = {
  id: string
  task_id: string
  kind: "upload" | "link"
  name: string
  url: string
  mime_type: string | null
  size_bytes: number | null
  created_at: string
}

export type Comment = {
  id: string
  task_id: string
  author: string
  body: string
  created_at: string
}

export type ActivityEntry = {
  id: string
  task_id: string
  actor: string
  action: string
  detail: Record<string, unknown> | null
  created_at: string
}

export type Task = {
  id: string
  title: string
  description: string
  column_id: string | null
  project_id: string | null
  position: number
  priority: Priority
  due_date: string | null
  github_repo_url: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type TaskWithRelations = Task & {
  labels: Label[]
  checklist: ChecklistItem[]
  attachments: Attachment[]
  comments_count: number
  attachments_count: number
}
