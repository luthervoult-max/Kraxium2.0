import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (val: boolean) => void
  label?: string
  id?: string
}

export function Toggle({ checked, onChange, label, id }: ToggleProps) {
  return (
    <div className="flex items-center justify-between">
      {label && (
        <label htmlFor={id} className="text-sm text-gray-300 cursor-pointer select-none">
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-blue focus-visible:ring-offset-2 focus-visible:ring-offset-deep-800',
          checked ? 'bg-neon-blue' : 'bg-deep-700 border border-white/10',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  )
}
