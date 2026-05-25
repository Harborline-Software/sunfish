import { useEffect, useState } from 'react'
import { queueCount } from '@/lib/offlineQueue'

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)
  const [queued, setQueued] = useState(queueCount)

  useEffect(() => {
    const onOnline = () => setOffline(false)
    const onOffline = () => setOffline(true)
    const onQueueChanged = () => setQueued(queueCount())
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('offline-queue-changed', onQueueChanged)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('offline-queue-changed', onQueueChanged)
    }
  }, [])

  if (!offline && queued === 0) return null

  if (!offline && queued > 0) {
    return (
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-center text-sm text-blue-800">
        Syncing {queued} queued payment{queued !== 1 ? 's' : ''}…
      </div>
    )
  }

  const queueLabel = queued > 0 ? ` — ${queued} payment${queued !== 1 ? 's' : ''} queued` : ''
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
      Offline — changes can't save yet{queueLabel}.
    </div>
  )
}
