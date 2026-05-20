import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export interface Shortcut {
  keys: string[]
  description: string
}

const NAV_SHORTCUTS: Shortcut[] = [
  { keys: ['g', 'p'], description: 'Go to Properties' },
  { keys: ['g', 'l'], description: 'Go to Leases' },
  { keys: ['g', 'r'], description: 'Go to Rent' },
  { keys: ['g', 'a'], description: 'Go to Accounting' },
  { keys: ['g', 'c'], description: 'Go to Comms' },
  { keys: ['g', 'm'], description: 'Go to Maintenance' },
  { keys: ['g', 'k'], description: 'Go to Cockpit' },
]

export const HELP_SHORTCUT: Shortcut = { keys: ['?'], description: 'Show keyboard shortcuts' }

export const ALL_SHORTCUTS: Shortcut[] = [...NAV_SHORTCUTS, HELP_SHORTCUT]

const ROUTE_MAP: Record<string, string> = {
  p: '/properties',
  l: '/leases',
  r: '/rent',
  a: '/accounting',
  c: '/comms',
  m: '/maintenance',
  k: '/cockpit',
}

function isFormElement(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export function useKeyboardShortcuts(onHelp: () => void): void {
  const navigate = useNavigate()
  const pendingGRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handleHelp = useCallback(onHelp, [onHelp])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isFormElement(e.target)) return
      if (e.ctrlKey || e.altKey || e.metaKey) return

      const key = e.key.toLowerCase()

      if (pendingGRef.current) {
        pendingGRef.current = false
        clearTimeout(timeoutRef.current)

        const route = ROUTE_MAP[key]
        if (route) {
          e.preventDefault()
          navigate(route)
        }
        return
      }

      if (key === 'g') {
        pendingGRef.current = true
        timeoutRef.current = setTimeout(() => {
          pendingGRef.current = false
        }, 1000)
        return
      }

      if (e.key === '?') {
        e.preventDefault()
        handleHelp()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timeoutRef.current)
    }
  }, [navigate, handleHelp])
}
