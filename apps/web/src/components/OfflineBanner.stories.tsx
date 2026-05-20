import type { Meta, StoryObj } from '@storybook/react'
import { OfflineBanner } from './OfflineBanner'

const meta: Meta<typeof OfflineBanner> = {
  title: 'UI/OfflineBanner',
  component: OfflineBanner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Amber banner that appears at the top of every page when the browser goes offline. ' +
          'Listens to `window` online/offline events and hides automatically on reconnect. ' +
          'Returns null when online — no DOM node is rendered.',
      },
    },
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof OfflineBanner>

export const Offline: Story = {
  render: () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
      writable: true,
    })
    return (
      <div className="min-h-16">
        <OfflineBanner />
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          'Banner visible when `navigator.onLine` is false. ' +
          'Forces offline state via `Object.defineProperty` for preview — ' +
          'in production this flips automatically when the device loses connectivity.',
      },
    },
  },
}

export const Online: Story = {
  render: () => {
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
      writable: true,
    })
    return (
      <div className="flex items-center justify-center h-16 text-sm text-gray-400 italic">
        (Component renders null when online — banner hidden)
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'When online, the component returns null and renders nothing.',
      },
    },
  },
}
