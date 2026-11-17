import { useCallback, useEffect, useState } from 'react'

export const PROJECT_CONTEXT_KEY = 'dreamex.project.context.v6'
export const PROJECT_CONTEXT_EVENT = 'dreamex:project-context-updated'

export interface SharedProjectContext {
  blueprintId: string
  projectName: string
  intentPrompt: string
  uslCeilingNodes: number
  p95TargetMs: number
  rbacRole: string
  gherkinScenario: string
  updatedAt: string
}

export function readSharedProjectContext(): SharedProjectContext | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(PROJECT_CONTEXT_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const rec = parsed as Record<string, unknown>
    if (typeof rec.projectName !== 'string' || typeof rec.intentPrompt !== 'string') return null
    return {
      blueprintId: typeof rec.blueprintId === 'string' ? rec.blueprintId : 'fintech',
      projectName: rec.projectName.slice(0, 120),
      intentPrompt: rec.intentPrompt.slice(0, 360),
      uslCeilingNodes: Number(rec.uslCeilingNodes) || 34,
      p95TargetMs: Number(rec.p95TargetMs) || 18,
      rbacRole: typeof rec.rbacRole === 'string' ? rec.rbacRole : 'admin',
      gherkinScenario: typeof rec.gherkinScenario === 'string' ? rec.gherkinScenario : '',
      updatedAt: typeof rec.updatedAt === 'string' ? rec.updatedAt : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function writeSharedProjectContext(context: SharedProjectContext): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PROJECT_CONTEXT_KEY, JSON.stringify(context))
    window.dispatchEvent(new CustomEvent(PROJECT_CONTEXT_EVENT, { detail: context }))
  } catch {
    /* Storage restricted */
  }
}

export function clearSharedProjectContext(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(PROJECT_CONTEXT_KEY)
    window.dispatchEvent(new CustomEvent(PROJECT_CONTEXT_EVENT, { detail: null }))
  } catch {
    /* Storage restricted */
  }
}

export function useProjectContextBus() {
  const [context, setContext] = useState<SharedProjectContext | null>(readSharedProjectContext)

  useEffect(() => {
    const sync = () => setContext(readSharedProjectContext())
    window.addEventListener(PROJECT_CONTEXT_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(PROJECT_CONTEXT_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const publishContext = useCallback((next: SharedProjectContext) => {
    writeSharedProjectContext(next)
    setContext(next)
  }, [])

  const resetContext = useCallback(() => {
    clearSharedProjectContext()
    setContext(null)
  }, [])

  return { context, publishContext, resetContext }
}
