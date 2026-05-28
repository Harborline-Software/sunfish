import type { Meta, StoryObj } from '@storybook/react'
import { StatusPill } from './status-pill'

const meta: Meta<typeof StatusPill> = {
  title: 'UI/StatusPill',
  component: StatusPill,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'success', 'warning', 'alert', 'critical'],
      description: 'Visual urgency tier',
      table: { defaultValue: { summary: 'neutral' } },
    },
    children: {
      control: 'text',
      description: 'Pill label — must convey the status in text (WCAG)',
    },
  },
}

export default meta
type Story = StoryObj<typeof StatusPill>

export const Neutral: Story = {
  args: { children: '14 days', variant: 'neutral' },
}

export const Success: Story = {
  args: { children: 'Current', variant: 'success' },
}

export const Warning: Story = {
  args: { children: '45 days', variant: 'warning' },
}

export const Alert: Story = {
  args: { children: '72 days', variant: 'alert' },
}

export const Critical: Story = {
  args: { children: '105 days', variant: 'critical' },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <StatusPill variant="neutral">14 days</StatusPill>
      <StatusPill variant="success">Current</StatusPill>
      <StatusPill variant="warning">45 days</StatusPill>
      <StatusPill variant="alert">72 days</StatusPill>
      <StatusPill variant="critical">105 days</StatusPill>
    </div>
  ),
}

export const AgingColumn: Story = {
  render: () => (
    <table className="text-sm">
      <thead>
        <tr className="border-b text-start text-gray-500">
          <th className="pb-2 pe-6 font-medium">Invoice</th>
          <th className="pb-2 font-medium">Days overdue</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        <tr>
          <td className="py-2 pe-6 font-mono text-gray-500">ab12cd34</td>
          <td className="py-2"><StatusPill variant="neutral">14 days</StatusPill></td>
        </tr>
        <tr>
          <td className="py-2 pe-6 font-mono text-gray-500">ef56gh78</td>
          <td className="py-2"><StatusPill variant="warning">45 days</StatusPill></td>
        </tr>
        <tr>
          <td className="py-2 pe-6 font-mono text-gray-500">ij90kl12</td>
          <td className="py-2"><StatusPill variant="alert">72 days</StatusPill></td>
        </tr>
        <tr>
          <td className="py-2 pe-6 font-mono text-gray-500">mn34op56</td>
          <td className="py-2"><StatusPill variant="critical">105 days</StatusPill></td>
        </tr>
      </tbody>
    </table>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Real-world usage: accounting "Days overdue" column. Threshold bands: ≤30 neutral, 31–60 warning, 61–90 alert, >90 critical.',
      },
    },
  },
}

export const DarkMode: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-900 p-4">
      <StatusPill variant="neutral">14 days</StatusPill>
      <StatusPill variant="success">Current</StatusPill>
      <StatusPill variant="warning">45 days</StatusPill>
      <StatusPill variant="alert">72 days</StatusPill>
      <StatusPill variant="critical">105 days</StatusPill>
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story:
          'All variants against dark background. Coloured pill variants render correctly; neutral is currently gray-600 — verify legibility in a full dark-mode Tailwind pass when sunfish#31 (dark-mode PR) merges.',
      },
    },
  },
}
