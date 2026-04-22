"use client"

import { IDENTITIES, useIdentity } from "@/lib/identity"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function IdentityGate({ children }: { children: React.ReactNode }) {
  const { identity, setIdentity, ready } = useIdentity()

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }

  if (identity) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md border-border/60 bg-card/80 p-8 backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path
                d="M3 6.5A2.5 2.5 0 0 1 5.5 4h4A2.5 2.5 0 0 1 12 6.5v11A2.5 2.5 0 0 1 9.5 20h-4A2.5 2.5 0 0 1 3 17.5v-11Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M14 6.5A2.5 2.5 0 0 1 16.5 4h2A2.5 2.5 0 0 1 21 6.5v6a2.5 2.5 0 0 1-2.5 2.5h-2A2.5 2.5 0 0 1 14 12.5v-6Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-balance">Welcome to Flow</h1>
            <p className="text-sm text-muted-foreground">Pick who you are to continue.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Object.values(IDENTITIES).map((ident) => (
            <Button
              key={ident.id}
              variant="outline"
              onClick={() => setIdentity(ident.id)}
              className="h-auto flex-col gap-2 py-4 hover:border-primary/50 hover:bg-accent/40"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: ident.color }}
              >
                {ident.initials}
              </span>
              <span className="text-sm font-medium">{ident.name}</span>
            </Button>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Comments and activity will be tagged with your name. You can change this later from the top bar.
        </p>
      </Card>
    </div>
  )
}
