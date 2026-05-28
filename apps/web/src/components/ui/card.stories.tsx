import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Container with rounded border and shadow. Used in the Properties grid, Rent Collection form, and anywhere content needs visual grouping.',
      },
    },
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  render: () => (
    <Card className="w-72">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Supporting description text</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">Card body content goes here.</p>
      </CardContent>
    </Card>
  ),
}

export const WithFooter: Story = {
  render: () => (
    <Card className="w-72">
      <CardHeader>
        <CardTitle>Card with Footer</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">Content area.</p>
      </CardContent>
      <CardFooter>
        <button className="text-sm text-blue-600 hover:text-blue-800">Action</button>
      </CardFooter>
    </Card>
  ),
}

export const PropertyCard: Story = {
  render: () => (
    <Card className="w-72">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">123 Oak Street</CardTitle>
          <span className="inline-flex items-center rounded-full border border-transparent bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
            Active
          </span>
        </div>
        <CardDescription>Portland, OR · Unit A</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500">2 units</p>
      </CardContent>
    </Card>
  ),
  parameters: {
    docs: {
      description: { story: 'Real-world usage in PropertiesPage — the property grid card.' },
    },
  },
}

export const FormCard: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="text-base">Payment details</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">Form fields would appear here.</p>
      </CardContent>
    </Card>
  ),
  parameters: {
    docs: {
      description: { story: 'Usage in RentCollectionPage — wraps the payment form.' },
    },
  },
}
