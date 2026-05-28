import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './badge'

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Status and category labels. Six variants cover the full Sunfish status vocabulary: default, secondary, destructive, outline, success, and warning.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline', 'success', 'warning'],
      description: 'Visual style variant',
      table: { defaultValue: { summary: 'default' } },
    },
    children: {
      control: 'text',
      description: 'Badge label text',
    },
  },
}

export default meta
type Story = StoryObj<typeof Badge>

export const Default: Story = {
  args: { children: 'Badge' },
}

export const Success: Story = {
  args: { variant: 'success', children: 'Active' },
}

export const Warning: Story = {
  args: { variant: 'warning', children: 'Expiring soon' },
}

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Cancelled' },
}

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Pending' },
}

export const Outline: Story = {
  args: { variant: 'outline', children: 'Sold' },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="success">Active</Badge>
      <Badge variant="warning">Expiring</Badge>
      <Badge variant="destructive">Overdue</Badge>
      <Badge variant="secondary">Pending</Badge>
      <Badge variant="outline">Sold</Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All six variants shown together. Use this to verify visual consistency.',
      },
    },
  },
}

export const LeaseStatuses: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge variant="success">Active</Badge>
      <Badge variant="outline">Expired</Badge>
      <Badge variant="secondary">Pending</Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'Real-world usage in the Leases table — LeasePage status column.' },
    },
  },
}

export const ExpiryWarning: Story = {
  render: () => (
    <Badge variant="warning" className="text-xs">
      42 days left
    </Badge>
  ),
  parameters: {
    docs: {
      description: { story: 'Inline expiry chip in the Leases table end-date column.' },
    },
  },
}
