"use client"

import { createBrowserClient } from "@supabase/ssr"

// Public Supabase credentials. Safe to commit: the URL is a public endpoint and
// the anon key is intentionally shipped to browsers — table access is gated by
// row-level security policies, not by key secrecy. Env vars take precedence so
// a different project can be wired in without code changes.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://vufhdtocaebzriaebjap.supabase.co"
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1ZmhkdG9jYWVienJpYWViamFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTM0NTAsImV4cCI6MjA5MjM4OTQ1MH0.4fRPjyhlfIZLQ5D0ctnGh6wFHxuJNP8QLp8snvTk-No"

let client: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  if (!client) {
    client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return client
}
