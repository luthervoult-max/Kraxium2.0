import { Card, CardContent } from '@/components/ui/card'
import { SparkAreaChart } from '@tremor/react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string
  change: string
  color: string
  trend: { day: string; value: number }[]
}

export default function MetricCard({ title, value, change, color, trend }: MetricCardProps) {
  const isPositive = change.trim().startsWith('+')
  const TrendIcon = isPositive ? TrendingUp : TrendingDown
  const trendColor = isPositive ? 'text-neon-green' : 'text-neon-magenta'

  return (
    <Card className="bg-deep-800/60 backdrop-blur-md border-white/5 hover:border-neon-blue/40 hover:shadow-[0_0_25px_rgba(0,212,255,0.2)] transition-all duration-300">
      <CardContent className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-gray-400 uppercase tracking-wider">{title}</p>
          <span
            className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}
            title={`${change} comparado ao mês anterior`}
          >
            <TrendIcon size={12} aria-hidden="true" />
            {change}
          </span>
        </div>

        <p
          className="text-3xl font-bold text-white tracking-tight font-display"
          style={{ textShadow: `0 0 12px ${color}66` }}
        >
          {value}
        </p>

        <div className="h-12 -mx-1">
          <SparkAreaChart
            data={trend}
            categories={['value']}
            index="day"
            colors={[color] as never}
            className="h-12 w-full"
          />
        </div>

        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Últimos 7 dias</p>
      </CardContent>
    </Card>
  )
}
