import { useCallback, useEffect, useRef, useState } from 'react'
import * as signalR from '@microsoft/signalr'

export type HubState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

const BACKOFF_MS = [0, 2_000, 10_000, 30_000]

export function useHubConnection(url: string): {
  hubState: HubState
  invoke: (method: string, ...args: unknown[]) => Promise<void>
  on: (event: string, handler: (...args: unknown[]) => void) => () => void
} {
  const [hubState, setHubState] = useState<HubState>('disconnected')
  const connRef = useRef<signalR.HubConnection | null>(null)

  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(url, { withCredentials: true })
      .withAutomaticReconnect(BACKOFF_MS)
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.onreconnecting(() => setHubState('reconnecting'))
    conn.onreconnected(() => setHubState('connected'))
    conn.onclose(() => setHubState('disconnected'))

    connRef.current = conn
    setHubState('connecting')

    conn
      .start()
      .then(() => setHubState('connected'))
      .catch(() => setHubState('disconnected'))

    return () => {
      conn.stop().catch(() => {})
      connRef.current = null
    }
  }, [url])

  const invoke = useCallback(async (method: string, ...args: unknown[]): Promise<void> => {
    const conn = connRef.current
    if (conn?.state === signalR.HubConnectionState.Connected) {
      await conn.invoke(method, ...args)
    }
  }, [])

  const on = useCallback(
    (event: string, handler: (...args: unknown[]) => void): (() => void) => {
      const conn = connRef.current
      conn?.on(event, handler)
      return () => conn?.off(event, handler)
    },
    [],
  )

  return { hubState, invoke, on }
}
