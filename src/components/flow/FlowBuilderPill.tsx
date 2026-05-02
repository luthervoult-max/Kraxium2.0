import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function BuilderPill({
  label,
  tone,
}: {
  label: string
  tone: 'blue' | 'magenta' | 'green' | 'orange' | 'red' | 'neutral'
}) {
  const toneClass =
    tone === 'blue'
      ? 'border-neon-purple/30 bg-neon-purple/12 text-neon-purple'
      : tone === 'magenta'
      ? 'border-neon-magenta/30 bg-neon-magenta/12 text-neon-magenta'
      : tone === 'red'
      ? 'border-danger/35 bg-danger/15 text-danger-soft'
      : tone === 'green'
      ? 'border-neon-green/30 bg-neon-green/12 text-neon-green'
      : tone === 'orange'
      ? 'border-neon-orange/30 bg-neon-orange/12 text-neon-orange'
      : 'border-white/10 bg-white/5 text-gray-300'

  return (
    <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]', toneClass)}>
      {label}
    </Badge>
  )
}
