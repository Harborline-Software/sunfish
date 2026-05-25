const QUEUE_KEY = 'sunfish:offline-payment-queue'

export interface QueuedPayment {
  id: string
  payload: {
    leaseId: string
    amount: number
    currency: string
    direction: 'Inbound' | 'Outbound'
    paidAt: string
    method: string
  }
  queuedAt: string
}

export function enqueuePayment(payload: QueuedPayment['payload']): void {
  const queue = readQueue()
  queue.push({ id: crypto.randomUUID(), payload, queuedAt: new Date().toISOString() })
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  window.dispatchEvent(new Event('offline-queue-changed'))
}

export function drainQueue(): QueuedPayment[] {
  const queue = readQueue()
  localStorage.removeItem(QUEUE_KEY)
  window.dispatchEvent(new Event('offline-queue-changed'))
  return queue
}

export function queueCount(): number {
  return readQueue().length
}

function readQueue(): QueuedPayment[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as QueuedPayment[]
  } catch {
    return []
  }
}
