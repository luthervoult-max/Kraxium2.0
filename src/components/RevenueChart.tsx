import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { AreaChart } from '@tremor/react'
import { cn } from '@/lib/utils'

interface DataPoint {
  date: string
  Receita: number
  Conversões: number
}

interface RevenueChartProps {
  data: DataPoint[]
}

const ranges = ['7D', '30D', '90D'] as const
type Range = (typeof ranges)[number]

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(n)

export default function RevenueChart({ data }: RevenueChartProps) {
  const [range, setRange] = useState<Range>('30D')

  const sliced =
    range === '7D' ? data.slice(-7) : range === '30D' ? data.slice(-30) : data

  const totalReceita = sliced.reduce((acc, d) => acc + d.Receita, 0)
  const totalConv = sliced.reduce((acc, d) => acc + d.Conversões, 0)

  return (
    <Card className="bg-deep-800/60 backdrop-blur-md border-white/5">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Performance Operacional</h3>
            <div className="flex items-baseline gap-4 mt-2">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Receita</p>
                <p
                  className="text-2xl font-bold text-white font-display"
                  style={{ textShadow: '0 0 12px rgba(0,212,255,0.4)' }}
                >
                  {formatBRL(totalReceita)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Conversões</p>
                <p className="text-2xl font-bold text-neon-green font-display">
                  {totalConv.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          <div
            role="group"
            aria-label="Selecionar período"
            className="flex items-center gap-1 p-1 bg-deep-900/60 border border-white/5 rounded-md"
          >
            {ranges.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                onClick={() => setRange(r)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded transition-colors',
                  range === r
                    ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30'
                    : 'text-gray-400 hover:text-white border border-transparent',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <AreaChart
          data={sliced}
          index="date"
          categories={['Receita', 'Conversões']}
          colors={['cyan', 'green']}
          valueFormatter={(value) => value.toLocaleString('pt-BR')}
          showLegend
          showGridLines={false}
          showAnimation
          curveType="monotone"
          className="h-64 mt-2"
          yAxisWidth={60}
        />
      </CardContent>
    </Card>
  )
}
