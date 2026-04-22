"use client"

import { useState } from "react"
import { KanbanProvider, useKanban } from "@/lib/kanban-store"
import { IdentityGate } from "@/components/kanban/identity-gate"
import { TopBar } from "@/components/kanban/top-bar"
import { Board } from "@/components/kanban/board"
import { AnalyticsBar } from "@/components/kanban/analytics-bar"

export default function Page() {
  return (
    <IdentityGate>
      <KanbanProvider>
        <KanbanApp />
      </KanbanProvider>
    </IdentityGate>
  )
}

function KanbanApp() {
  const { ready } = useKanban()
  const [projectFilterId, setProjectFilterId] = useState<string | null>(null)

  return (
    <div className="flex h-screen flex-col bg-background">
      <TopBar projectFilterId={projectFilterId} onProjectFilterChange={setProjectFilterId} />
      <main className="flex min-h-0 flex-1 flex-col pt-4">
        {ready ? (
          <Board projectFilterId={projectFilterId} />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
        )}
      </main>
      {ready && <AnalyticsBar projectFilterId={projectFilterId} />}
    </div>
  )
}
