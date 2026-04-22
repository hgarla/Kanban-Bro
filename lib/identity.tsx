"use client"

import { createContext, useContext, useEffect, useState } from "react"

export type IdentityId = "me" | "brother"

export type Identity = {
  id: IdentityId
  name: string
  color: string
  initials: string
}

export const IDENTITIES: Record<IdentityId, Identity> = {
  me: { id: "me", name: "Harshith", color: "#6366f1", initials: "H" },
  brother: { id: "brother", name: "Ankit", color: "#10b981", initials: "A" },
}

const STORAGE_KEY = "kanban.identity"

type Ctx = {
  identity: Identity | null
  setIdentity: (id: IdentityId) => void
  clear: () => void
  ready: boolean
}

const IdentityContext = createContext<Ctx | null>(null)

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentityState] = useState<Identity | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && (saved === "me" || saved === "brother")) {
        setIdentityState(IDENTITIES[saved as IdentityId])
      }
    } catch {}
    setReady(true)
  }, [])

  function setIdentity(id: IdentityId) {
    const ident = IDENTITIES[id]
    setIdentityState(ident)
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {}
  }

  function clear() {
    setIdentityState(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }

  return (
    <IdentityContext.Provider value={{ identity, setIdentity, clear, ready }}>{children}</IdentityContext.Provider>
  )
}

export function useIdentity() {
  const ctx = useContext(IdentityContext)
  if (!ctx) throw new Error("useIdentity must be used within IdentityProvider")
  return ctx
}
