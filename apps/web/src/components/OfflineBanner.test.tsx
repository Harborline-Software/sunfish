import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { OfflineBanner } from './OfflineBanner'
import * as offlineQueue from '@/lib/offlineQueue'

describe('OfflineBanner', () => {
  beforeEach(() => {
    vi.spyOn(offlineQueue, 'queueCount').mockReturnValue(0)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when online with empty queue', () => {
    const { container } = render(<OfflineBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('shows amber offline banner when offline with empty queue', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    render(<OfflineBanner />)
    expect(screen.getByText(/Offline — changes can't save yet\./)).toBeInTheDocument()
  })

  it('shows queue count in amber banner when offline + payments queued', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    vi.spyOn(offlineQueue, 'queueCount').mockReturnValue(3)
    render(<OfflineBanner />)
    expect(screen.getByText(/3 payments queued/)).toBeInTheDocument()
    expect(screen.getByText(/Offline/)).toBeInTheDocument()
  })

  it('uses singular "payment" when queue count is 1', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    vi.spyOn(offlineQueue, 'queueCount').mockReturnValue(1)
    render(<OfflineBanner />)
    expect(screen.getByText(/1 payment queued/)).toBeInTheDocument()
    expect(screen.queryByText(/payments queued/)).toBeNull()
  })

  it('shows blue syncing banner when online but queue is non-empty', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    vi.spyOn(offlineQueue, 'queueCount').mockReturnValue(2)
    render(<OfflineBanner />)
    expect(screen.getByText(/Syncing 2 queued payments…/)).toBeInTheDocument()
  })

  it('updates queue count when offline-queue-changed event fires', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const mockQueueCount = vi.spyOn(offlineQueue, 'queueCount').mockReturnValue(0)
    render(<OfflineBanner />)
    expect(screen.getByText(/Offline — changes can't save yet\./)).toBeInTheDocument()

    mockQueueCount.mockReturnValue(2)
    act(() => {
      window.dispatchEvent(new Event('offline-queue-changed'))
    })
    expect(screen.getByText(/2 payments queued/)).toBeInTheDocument()
  })
})
