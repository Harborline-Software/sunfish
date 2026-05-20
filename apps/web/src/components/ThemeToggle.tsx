import { Monitor, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/themeStore'
import type { ThemePreference } from '@/lib/theme'

const OPTIONS: { value: ThemePreference; Icon: typeof Monitor; label: string }[] = [
  { value: 'system', Icon: Monitor, label: 'System' },
  { value: 'light', Icon: Sun, label: 'Light' },
  { value: 'dark', Icon: Moon, label: 'Dark' },
]

export function ThemeToggle() {
  const { preference, setPreference } = useThemeStore()

  return (
    <div
      className="flex items-center rounded-md border border-border bg-muted p-0.5"
      role="radiogroup"
      aria-label="Color theme"
    >
      {OPTIONS.map(({ value, Icon, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          aria-label={label}
          onClick={() => setPreference(value)}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded transition-colors',
            preference === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon size={13} strokeWidth={2} />
        </button>
      ))}
    </div>
  )
}
