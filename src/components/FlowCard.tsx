import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@tremor/react'
import { Play, Pause } from 'lucide-react'

interface FlowCardProps {
  name: string
  status: 'active' | 'paused'
  progress: number
  tags: string[]
  leads: string
}

export default function FlowCard({ name, status, progress, tags, leads }: FlowCardProps) {
  return (
    <Card className="bg-deep-800/60 backdrop-blur-md border-white/5 hover:border-neon-purple/40 transition-colors">
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">{name}</h3>
          <Badge
            variant="outline"
            className={`flex items-center gap-1 text-xs ${
              status === 'active'
                ? 'bg-neon-green/10 border-neon-green/30 text-neon-green'
                : 'bg-neon-orange/10 border-neon-orange/30 text-neon-orange'
            }`}
          >
            {status === 'active' ? (
              <Play size={10} aria-hidden="true" />
            ) : (
              <Pause size={10} aria-hidden="true" />
            )}
            {status === 'active' ? 'Ativo' : 'Pausado'}
          </Badge>
        </div>

        <ProgressBar
          value={progress}
          color="purple"
          className="[&>div]:bg-gradient-to-r [&>div]:from-neon-purple [&>div]:to-neon-magenta"
        />

        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <code
              key={tag}
              className="text-[10px] bg-neon-purple/10 text-neon-purple border border-neon-purple/20 rounded-sm px-1.5 py-0.5 font-mono"
            >
              {tag}
            </code>
          ))}
        </div>

        <div className="flex justify-between text-xs text-gray-400">
          <span>{progress}% execução (24h)</span>
          <span>{leads} leads</span>
        </div>
      </CardContent>
    </Card>
  )
}
