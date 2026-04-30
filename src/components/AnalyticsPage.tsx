import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  DollarSign,
  Filter,
  GitBranch,
  Globe2,
  Megaphone,
  PieChart,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  Timer,
  Trophy,
  Undo2,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  getAnalyticsDashboard,
  getAnalyticsFilters,
  type AnalyticsAdvancedMetrics,
  type AnalyticsFilterOptions,
  type AnalyticsFilters,
  type AnalyticsFunnel,
  type AnalyticsOverview,
  type AnalyticsRankingItem,
  type AnalyticsRankings,
  type AnalyticsRevenueEventType,
  type AnalyticsTimeRange,
  type AnalyticsTimeSeries,
} from '@/lib/api/analytics'
import MetricCard from '@/components/MetricCard'

const timeRanges: Array<{ id: AnalyticsTimeRange; label: string }> = [
  { id: 'today', label: 'Hoje' },
  { id: 'yesterday', label: 'Ontem' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
  { id: 'all', label: 'Tudo' },
]

const typeOptions: Array<{ id: AnalyticsRevenueEventType | 'all'; label: string }> = [
  { id: 'all', label: 'Todos os Tipos' },
  { id: 'payment_generated', label: 'Pagamento gerado' },
  { id: 'payment_confirmed', label: 'Pagamento confirmado' },
  { id: 'refund', label: 'Reembolso' },
  { id: 'upsell', label: 'Upsell' },
  { id: 'downsell', label: 'Downsell' },
  { id: 'order_bump', label: 'Order bump' },
  { id: 'recovery', label: 'Recuperação' },
]

const emptyOverview: AnalyticsOverview = {
  interactions: 0,
  starts: 0,
  revenueGeneratedCents: 0,
  revenueConfirmedCents: 0,
  averageTicketCents: 0,
  startRate: 0,
  leadSaleRate: 0,
  approvalRate: 0,
  generatedPayments: 0,
  confirmedPayments: 0,
}

const emptyTimeSeries: AnalyticsTimeSeries = {
  hourly: Array.from({ length: 24 }, (_, hour) => ({
    hour: `${hour}h`,
    generated: 0,
    paid: 0,
    generatedAmountCents: 0,
    paidAmountCents: 0,
  })),
  weekdays: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day) => ({
    day,
    generated: 0,
    paid: 0,
    generatedAmountCents: 0,
    paidAmountCents: 0,
  })),
  calendar: [],
  monthLabel: '',
}

const emptyRankings: AnalyticsRankings = {
  topBots: [],
  topFlows: [],
  topPlans: [],
  topTickets: [],
  topDays: [],
  topCampaigns: [],
  topSources: [],
  topPositions: [],
  topSalesCodes: [],
  topCities: [],
  topDevices: [],
}

const emptyFunnel: AnalyticsFunnel = {
  starts: 0,
  generated: 0,
  paid: 0,
  startToGeneratedRate: 0,
  generatedToPaidRate: 0,
  startToPaidRate: 0,
}

const emptyAdvanced: AnalyticsAdvancedMetrics = {
  upsellRate: { rate: 0, numerator: 0, denominator: 0 },
  downsellRate: { rate: 0, numerator: 0, denominator: 0 },
  orderBumpRate: { rate: 0, numerator: 0, denominator: 0 },
  recoveryRate: { rate: 0, numerator: 0, denominator: 0 },
  recurrenceRate: { rate: 0, numerator: 0, denominator: 0 },
  retentionRate: { rate: 0, numerator: 0, denominator: 0 },
  upgradeRate: { rate: 0, numerator: 0, denominator: 0 },
  abandonmentRate: { rate: 0, numerator: 0, denominator: 0 },
  ltvAverageCents: 0,
  purchasesPerUser: 0,
  meanReturnDays: 0,
  meanStartToPaymentMinutes: 0,
  userCounters: [],
}

export default function AnalyticsPage() {
  const [filterOptions, setFilterOptions] = useState<AnalyticsFilterOptions>({
    bots: [],
    flows: [],
    gateways: [],
    sources: [],
    types: [],
  })
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('today')
  const [botId, setBotId] = useState('all')
  const [flowId, setFlowId] = useState('all')
  const [gateway, setGateway] = useState('all')
  const [source, setSource] = useState('all')
  const [type, setType] = useState<AnalyticsRevenueEventType | 'all'>('all')
  const [overview, setOverview] = useState<AnalyticsOverview>(emptyOverview)
  const [timeSeries, setTimeSeries] = useState<AnalyticsTimeSeries>(emptyTimeSeries)
  const [rankings, setRankings] = useState<AnalyticsRankings>(emptyRankings)
  const [funnel, setFunnel] = useState<AnalyticsFunnel>(emptyFunnel)
  const [advanced, setAdvanced] = useState<AnalyticsAdvancedMetrics>(emptyAdvanced)
  const [loading, setLoading] = useState(true)
  const [filterLoading, setFilterLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setFilterLoading(true)

    getAnalyticsFilters()
      .then((data) => {
        if (!cancelled) setFilterOptions(data)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Falha ao carregar filtros.'))
      })
      .finally(() => {
        if (!cancelled) setFilterLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const filters = useMemo<AnalyticsFilters>(() => ({
    timeRange,
    botId,
    flowId,
    gateway,
    source,
    type,
  }), [botId, flowId, gateway, source, timeRange, type])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getAnalyticsDashboard(filters)
      .then((dashboard) => {
        if (cancelled) return
        setOverview(dashboard.overview)
        setTimeSeries(dashboard.timeSeries)
        setRankings(dashboard.rankings)
        setFunnel(dashboard.funnel)
        setAdvanced(dashboard.advanced)
      })
      .catch((err) => {
        if (cancelled) return
        setOverview(emptyOverview)
        setTimeSeries(emptyTimeSeries)
        setRankings(emptyRankings)
        setFunnel(emptyFunnel)
        setAdvanced(emptyAdvanced)
        setError(getErrorMessage(err, 'Falha ao carregar analytics.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [filters])

  const filteredFlows = useMemo(() => {
    if (botId === 'all') return filterOptions.flows
    return filterOptions.flows.filter((flow) => flow.bot_id === botId)
  }, [botId, filterOptions.flows])

  const metricCards = useMemo(() => ([
    {
      title: 'Receita Total',
      value: formatCurrency(overview.revenueConfirmedCents),
      change: `+${overview.approvalRate}% aprov.`,
      color: '#39ff14',
      trend: buildSparkTrend(timeSeries.weekdays, 'day', 'paidAmountCents'),
    },
    {
      title: 'Conversão',
      value: `${overview.leadSaleRate}%`,
      change: `+${overview.confirmedPayments} vendas`,
      color: '#b44dff',
      trend: buildSparkTrend(timeSeries.weekdays, 'day', 'paid'),
    },
    {
      title: 'Usuários/Leads',
      value: overview.interactions.toLocaleString('pt-BR'),
      change: `+${overview.starts} starts`,
      color: '#ff2a9d',
      trend: buildSparkTrend(timeSeries.weekdays, 'day', 'generated'),
    },
  ]), [overview, timeSeries.weekdays])

  function clearFilters() {
    setBotId('all')
    setFlowId('all')
    setGateway('all')
    setSource('all')
    setType('all')
  }

  function handleBotChange(nextBotId: string) {
    setBotId(nextBotId)
    setFlowId('all')
  }

  return (
    <main className="space-y-8 p-6">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-neon-purple">Performance</p>
          <h2 className="text-4xl font-black tracking-tight text-white">Métricas</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            Painel real de receita, conversão, leads e desempenho dos fluxos. O canvas fica apenas no Flow Builder.
          </p>
        </div>

        <TimeRangeTabs value={timeRange} onChange={setTimeRange} />
      </section>

      <section className="rounded-[18px] border border-white/10 bg-[#0c0d10] p-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
          <FilterSelect
            icon={Bot}
            label="Bot"
            value={botId}
            onChange={handleBotChange}
            disabled={filterLoading}
            options={[
              { value: 'all', label: 'Todos os Bots' },
              ...filterOptions.bots.map((bot) => ({ value: bot.id, label: bot.name })),
            ]}
          />
          <FilterSelect
            icon={GitBranch}
            label="Fluxo"
            value={flowId}
            onChange={setFlowId}
            disabled={filterLoading}
            options={[
              { value: 'all', label: 'Todos os Fluxos' },
              ...filteredFlows.map((flow) => ({ value: flow.id, label: flow.name })),
            ]}
          />
          <FilterSelect
            icon={CircleDollarSign}
            label="Gateway"
            value={gateway}
            onChange={setGateway}
            disabled={filterLoading}
            options={[
              { value: 'all', label: 'Todos os Gateways' },
              ...filterOptions.gateways.map((item) => ({ value: item, label: item })),
            ]}
          />
          <FilterSelect
            icon={Globe2}
            label="Origem"
            value={source}
            onChange={setSource}
            disabled={filterLoading}
            options={[
              { value: 'all', label: 'Todas as Fontes' },
              ...filterOptions.sources.map((item) => ({ value: item, label: item })),
            ]}
          />
          <FilterSelect
            icon={Filter}
            label="Tipo de evento"
            value={type}
            onChange={(value) => setType(value as AnalyticsRevenueEventType | 'all')}
            disabled={filterLoading}
            options={typeOptions.map((item) => ({ value: item.id, label: item.label }))}
          />
          <Button
            type="button"
            variant="outline"
            onClick={clearFilters}
            className="h-[54px] rounded-[14px] border-white/10 bg-white/5 px-5 text-xs font-black uppercase tracking-[0.12em] text-gray-500 hover:border-neon-purple/30 hover:bg-neon-purple/10 hover:text-neon-purple"
          >
            Limpar
          </Button>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-neon-orange/30 bg-neon-orange/10 px-4 py-3 text-sm leading-6 text-neon-orange">
          {isAnalyticsSchemaMissing(error)
            ? 'Aplique a migration supabase/migrations/20260430000300_create_analytics_revenue_events.sql no Supabase para ativar Analytics.'
            : error}
        </div>
      )}

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <span className="h-2 w-2 rounded-full bg-neon-purple" />
          Métricas Principais
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }, (_, index) => (
              <LoaderBlock key={index} className="h-[174px] w-full" />
            ))
            : metricCards.map((metric) => (
              <MetricCard key={metric.title} {...metric} />
            ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <span className="h-2 w-2 rounded-full bg-neon-magenta" />
          Performance ao Longo do Tempo
        </h2>
        <ChartPanel
          title="Receita e Conversões"
          subtitle="Série real por dia da semana"
          icon={CalendarDays}
          loading={loading}
          footer={[
            { label: 'Receita confirmada', value: formatCurrency(overview.revenueConfirmedCents) },
            { label: 'Pagamentos gerados', value: overview.generatedPayments },
            { label: 'Pagamentos pagos', value: overview.confirmedPayments },
            { label: 'Conversão lead -> venda', value: `${overview.leadSaleRate}%` },
          ]}
        >
          <LineChart
            data={timeSeries.weekdays}
            xKey="day"
            generatedKey="generatedAmountCents"
            paidKey="paidAmountCents"
            generatedLabel="Receita gerada"
            paidLabel="Receita confirmada"
          />
        </ChartPanel>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <span className="h-2 w-2 rounded-full bg-neon-green" />
          Flows e Funis
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }, (_, index) => (
              <LoaderBlock key={index} className="h-[186px] w-full" />
            ))
          ) : rankings.topFlows.length === 0 ? (
            <section className="rounded-[14px] border border-white/10 bg-[#0c0d10] p-6 md:col-span-2 xl:col-span-4">
              <EmptyState label="Nenhum fluxo com vendas para o periodo selecionado" />
            </section>
          ) : (
            rankings.topFlows.slice(0, 4).map((flow, index) => (
              <FlowPerformanceCard
                key={flow.id}
                item={flow}
                index={index}
                totalPayments={overview.confirmedPayments}
                totalRevenueCents={overview.revenueConfirmedCents}
              />
            ))
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        <FunnelPanel funnel={funnel} loading={loading} />
        <RankingCard icon={Bot} title="Top Bots" subtitle="Mais vendidos" items={rankings.topBots} loading={loading} empty="Nenhum bot vendido" />
        <RankingCard icon={Trophy} title="Top Planos" subtitle="Mais vendidos" items={rankings.topPlans} loading={loading} empty="Nenhum plano disponivel" />
        <RankingCard icon={Megaphone} title="Top Campanhas" subtitle="Trafego pago" items={rankings.topCampaigns} loading={loading} empty="Nenhuma campanha com vendas" />
        <RankingCard icon={Globe2} title="Fontes de Trafego" subtitle="De onde vem as vendas" items={rankings.topSources} loading={loading} empty="Nenhuma fonte capturada" />
        <AverageTimeCard advanced={advanced} loading={loading} />
        <RankingCard icon={Smartphone} title="Dispositivos" subtitle="Distribuicao por tipo" items={rankings.topDevices} loading={loading} empty="Nenhum dispositivo disponivel" />
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <span className="h-2 w-2 rounded-full bg-neon-orange" />
          Métricas Avançadas
        </h2>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
          <RateCard icon={ArrowUpRight} title="Taxa Upsell" metric={advanced.upsellRate} helper="vendas" tone="green" loading={loading} />
          <RateCard icon={ArrowDownRight} title="Taxa Downsell" metric={advanced.downsellRate} helper="recusas" tone="orange" loading={loading} />
          <RateCard icon={Zap} title="Taxa OrderBump" metric={advanced.orderBumpRate} helper="checkouts" tone="yellow" loading={loading} />
          <RateCard icon={Undo2} title="Taxa Recuperação" metric={advanced.recoveryRate} helper="pendentes" tone="purple" loading={loading} />
          <RateCard icon={RefreshCcw} title="Taxa Recorrencia" metric={advanced.recurrenceRate} helper="compradores" tone="blue" loading={loading} />
          <RateCard icon={ShieldCheck} title="Taxa Retencao" metric={advanced.retentionRate} helper="compradores" tone="green" loading={loading} />
          <RateCard icon={ArrowUpRight} title="Taxa Upgrade" metric={advanced.upgradeRate} helper="compradores" tone="blue" loading={loading} />
          <RateCard icon={ArrowDownRight} title="Taxa Abandono" metric={advanced.abandonmentRate} helper="starts" tone="red" loading={loading} />
          <ValueCard icon={DollarSign} title="LTV Medio" value={formatCurrency(advanced.ltvAverageCents)} helper="gasto medio por cliente" tone="green" loading={loading} />
          <ValueCard icon={PieChart} title="Vendas por Usuario" value={`${advanced.purchasesPerUser}x`} helper="compras por cliente" tone="purple" loading={loading} />
          <ValueCard icon={Timer} title="Tempo Medio Retorno" value={`${advanced.meanReturnDays}`} helper="dias para recompra" tone="orange" loading={loading} />
          <CountersCard counters={advanced.userCounters} loading={loading} />
        </div>
      </section>
    </main>
  )
}

function TimeRangeTabs({
  value,
  onChange,
}: {
  value: AnalyticsTimeRange
  onChange: (value: AnalyticsTimeRange) => void
}) {
  return (
    <div className="inline-flex w-fit rounded-[14px] border border-white/10 bg-[#0d0f16] p-1">
      {timeRanges.map((item) => {
        const isActive = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              'h-11 rounded-[10px] px-5 text-sm font-black transition-colors',
              isActive ? 'bg-white/10 text-white shadow-[inset_0_0_18px_rgba(255,255,255,0.04)]' : 'text-gray-500 hover:text-gray-200',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

function FilterSelect({
  icon: Icon,
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  icon: LucideIcon
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <label className="relative block">
      <Icon
        size={16}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neon-purple/80"
        aria-hidden="true"
      />
      <select
        value={value}
        aria-label={label}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-[54px] w-full appearance-none rounded-[14px] border border-white/10 bg-[#101116] pl-11 pr-9 text-sm font-bold text-gray-300 outline-none transition-colors focus:border-neon-purple/45 disabled:opacity-50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#101116] text-gray-200">
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-600">v</span>
    </label>
  )
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  progress,
  progressLabel,
  helper,
  tone,
  loading,
}: {
  icon: LucideIcon
  label: string
  value: number | string
  progress: number
  progressLabel: string
  helper: string
  tone: 'blue' | 'purple' | 'green' | 'gray'
  loading: boolean
}) {
  const classes = {
    blue: 'text-neon-purple border-neon-purple/20 bg-neon-purple/10',
    purple: 'text-neon-magenta border-neon-magenta/20 bg-neon-magenta/10',
    green: 'text-neon-green border-neon-green/20 bg-neon-green/10',
    gray: 'text-gray-100 border-white/10 bg-white/5',
  }[tone]
  const accentColor = {
    blue: '#b44dff',
    purple: '#ff2a9d',
    green: '#39ff14',
    gray: '#b44dff',
  }[tone]

  return (
    <article className="relative min-h-[220px] overflow-hidden rounded-[14px] border border-white/10 bg-[#0c0d10] p-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[12px] font-black uppercase tracking-[0.2em] text-gray-500">{label}</p>
        <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl border p-3', classes)}>
          <Icon size={22} aria-hidden="true" />
        </span>
      </div>
      {loading ? (
        <div className="mt-8 flex items-center gap-5">
          <LoaderBlock className="h-24 w-24 rounded-full" />
          <LoaderBlock className="h-14 w-36" />
        </div>
      ) : (
        <div className="mt-8 flex items-center gap-5">
          <DonutMetric percent={progress} color={accentColor} label={progressLabel} />
          <div className="min-w-0">
            <p className={cn('break-words text-[clamp(2rem,3vw,3.25rem)] font-black leading-none tracking-tight', tone === 'green' ? 'text-neon-green' : 'text-white')}>
              {value}
            </p>
            <p className="mt-3 text-xs font-black uppercase tracking-[0.08em] text-gray-600">{helper}</p>
          </div>
        </div>
      )}
    </article>
  )
}

function DonutMetric({ percent, color, label }: { percent: number; color: string; label: string }) {
  const value = clampPercent(percent)

  return (
    <div className="shrink-0">
      <div
        className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/10 shadow-[0_0_28px_rgba(180,77,255,0.12)]"
        style={{
          background: `conic-gradient(${color} ${value * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
        }}
        aria-label={`${value}% ${label}`}
      >
        <div className="absolute inset-3 rounded-full border border-white/10 bg-[#0c0d10]" />
        <div className="relative text-center">
          <p className="font-mono text-xl font-black text-white">{value}%</p>
          <p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-gray-600">taxa</p>
        </div>
      </div>
      <p className="mt-2 max-w-24 text-center text-[10px] font-black uppercase leading-4 tracking-[0.1em] text-gray-600">
        {label}
      </p>
    </div>
  )
}

function ChartPanel({
  title,
  subtitle,
  icon: Icon,
  children,
  footer,
  loading,
}: {
  title: string
  subtitle: string
  icon: LucideIcon
  children: ReactNode
  footer?: Array<{ label: string; value: string | number }>
  loading: boolean
}) {
  return (
    <section className="rounded-[14px] border border-white/10 bg-[#0c0d10] p-6">
      <div className="mb-7 flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-neon-purple/20 bg-neon-purple/10 text-neon-purple">
          <Icon size={21} aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-xl font-black text-white">{title}</h3>
          <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.22em] text-gray-500">{subtitle}</p>
        </div>
      </div>
      {loading ? <LoaderBlock className="h-[260px] w-full" /> : children}
      {footer && (
        <div className="mt-7 grid grid-cols-1 gap-3 border-t border-white/10 pt-5 md:grid-cols-3 xl:grid-cols-4">
          {footer.map((item) => (
            <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-600">{item.label}</p>
              <p className="mt-2 text-lg font-black text-white">{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function LineChart<T extends Record<string, string | number>>({
  data,
  xKey,
  generatedKey,
  paidKey,
  generatedLabel,
  paidLabel,
}: {
  data: T[]
  xKey: keyof T
  generatedKey: keyof T
  paidKey: keyof T
  generatedLabel: string
  paidLabel: string
}) {
  const width = 960
  const height = 260
  const padding = 32
  const max = Math.max(1, ...data.flatMap((item) => [Number(item[generatedKey] ?? 0), Number(item[paidKey] ?? 0)]))
  const generatedPoints = makePoints(data, generatedKey, width, height, padding, max)
  const paidPoints = makePoints(data, paidKey, width, height, padding, max)

  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[720px]">
          {[0, 0.33, 0.66, 1].map((line) => {
            const y = padding + (height - padding * 2) * line
            return <line key={line} x1={padding} x2={width - padding} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="5 6" />
          })}
          <polyline points={generatedPoints} fill="none" stroke="#b44dff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={paidPoints} fill="none" stroke="#39ff14" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {data.map((item, index) => {
            const x = getX(index, data.length, width, padding)
            return (
              <g key={String(item[xKey])}>
                <circle cx={x} cy={getY(Number(item[paidKey] ?? 0), height, padding, max)} r="4" fill="#39ff14" />
                <text x={x} y={height - 6} textAnchor="middle" className="fill-gray-500 text-[11px]">
                  {String(item[xKey])}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <div className="mt-4 flex justify-center gap-5 text-xs">
        <span className="inline-flex items-center gap-2 text-neon-purple">
          <span className="h-2.5 w-2.5 rounded-sm bg-neon-purple" />
          {generatedLabel}
        </span>
        <span className="inline-flex items-center gap-2 text-neon-green">
          <span className="h-2.5 w-2.5 rounded-sm bg-neon-green" />
          {paidLabel}
        </span>
      </div>
    </div>
  )
}

function CalendarPanel({ timeSeries, loading }: { timeSeries: AnalyticsTimeSeries; loading: boolean }) {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const leadingBlanks = firstDay.getDay()

  return (
    <section className="rounded-[14px] border border-white/10 bg-[#0c0d10] p-6">
      <div className="mb-7 flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-neon-purple/20 bg-neon-purple/10 text-neon-purple">
          <CalendarDays size={21} aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-xl font-black text-white">Calendario</h3>
          <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.22em] text-gray-500">
            {timeSeries.monthLabel || 'Periodo atual'}
          </p>
        </div>
      </div>

      {loading ? (
        <LoaderBlock className="h-[340px] w-full" />
      ) : (
        <>
          <p className="mb-5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-xs text-gray-500">
            Dias destacados possuem pagamento confirmado ou checkout gerado.
          </p>
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-black uppercase tracking-[0.12em] text-gray-600">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
          </div>
          <div className="mt-3 grid grid-cols-7 gap-2">
            {Array.from({ length: leadingBlanks }).map((_, index) => (
              <span key={`blank-${index}`} className="h-11" />
            ))}
            {timeSeries.calendar.map((day) => {
              const hasData = day.generated > 0 || day.paid > 0
              const isToday = day.day === today.getDate()
              return (
                <div
                  key={day.day}
                  className={cn(
                    'flex h-11 items-center justify-center rounded-xl border text-sm font-bold transition-colors',
                    hasData
                      ? 'border-neon-purple/35 bg-neon-purple/15 text-neon-purple'
                      : 'border-transparent text-gray-500',
                    isToday && 'border-neon-green/45 text-neon-green',
                  )}
                  title={hasData ? `${day.generated} gerados, ${day.paid} pagos` : undefined}
                >
                  {day.day}
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}

function FlowPerformanceCard({
  item,
  index,
  totalPayments,
  totalRevenueCents,
}: {
  item: AnalyticsRankingItem
  index: number
  totalPayments: number
  totalRevenueCents: number
}) {
  const amountCents = item.amountCents ?? 0
  const revenueShare = totalRevenueCents > 0 && amountCents > 0 ? (amountCents / totalRevenueCents) * 100 : 0
  const salesShare = totalPayments > 0 ? (item.value / totalPayments) * 100 : 0
  const progress = clampPercent(revenueShare || salesShare)
  const progressLabel = amountCents > 0 ? 'da receita' : 'das vendas'

  return (
    <article className="rounded-[14px] border border-white/10 bg-deep-800/60 p-4 backdrop-blur-md transition-colors hover:border-neon-purple/40">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate text-sm font-semibold text-white">{item.label}</h3>
        <span className="rounded-full border border-neon-green/30 bg-neon-green/10 px-2 py-1 font-mono text-[10px] font-black text-neon-green">
          #{index + 1}
        </span>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-neon-purple to-neon-magenta"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <code className="rounded-sm border border-neon-purple/20 bg-neon-purple/10 px-1.5 py-0.5 font-mono text-[10px] text-neon-purple">
          {item.value} vendas
        </code>
        <code className="rounded-sm border border-neon-green/20 bg-neon-green/10 px-1.5 py-0.5 font-mono text-[10px] text-neon-green">
          {formatCurrency(amountCents)}
        </code>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 text-xs text-gray-400">
        <span>{progress}% {progressLabel}</span>
        <span className="truncate">{item.detail ?? 'ranking real'}</span>
      </div>
    </article>
  )
}

function RankingCard({
  icon: Icon,
  title,
  subtitle,
  items,
  loading,
  empty,
  className,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
  items: AnalyticsRankingItem[]
  loading: boolean
  empty: string
  className?: string
}) {
  return (
    <section className={cn('min-h-[260px] rounded-[14px] border border-white/10 bg-[#0c0d10] p-6', className)}>
      <PanelHeader icon={Icon} title={title} subtitle={subtitle} />
      {loading ? (
        <LoaderBlock className="mt-8 h-28 w-full" />
      ) : items.length === 0 ? (
        <EmptyState label={empty} />
      ) : (
        <ol className="mt-7 space-y-3">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">
                  <span className="mr-2 text-neon-purple">#{index + 1}</span>
                  {item.label}
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  {item.amountCents !== undefined ? formatCurrency(item.amountCents) : `${item.value} registros`}
                </p>
              </div>
              <span className="font-mono text-sm font-black text-neon-green">{item.value}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function FunnelPanel({ funnel, loading }: { funnel: AnalyticsFunnel; loading: boolean }) {
  return (
    <section className="min-h-[260px] rounded-[14px] border border-white/10 bg-[#0c0d10] p-6 xl:col-span-2">
      <PanelHeader icon={Filter} title="Funil de Conversão" subtitle="Jornada do usuario ate a compra" />
      {loading ? (
        <LoaderBlock className="mt-8 h-36 w-full" />
      ) : (
        <div className="mt-8">
          <div className="grid grid-cols-3 gap-3 text-center">
            <FunnelStep label="/START" value={funnel.starts} rate={100} />
            <FunnelStep label="PIX gerado" value={funnel.generated} rate={funnel.startToGeneratedRate} />
            <FunnelStep label="Pago" value={funnel.paid} rate={funnel.startToPaidRate} />
          </div>
          <div className="mt-8 grid grid-cols-1 gap-3 border-t border-white/10 pt-5 md:grid-cols-3">
            <FunnelRate label="Start -> PIX" value={funnel.startToGeneratedRate} />
            <FunnelRate label="PIX -> Pago" value={funnel.generatedToPaidRate} />
            <FunnelRate label="Start -> Pago" value={funnel.startToPaidRate} />
          </div>
        </div>
      )}
    </section>
  )
}

function AverageTimeCard({ advanced, loading }: { advanced: AnalyticsAdvancedMetrics; loading: boolean }) {
  return (
    <section className="rounded-[14px] border border-white/10 bg-[#0c0d10] p-6">
      <PanelHeader icon={Clock3} title="Tempo Medio" subtitle="/start -> pagamento" />
      {loading ? (
        <LoaderBlock className="mt-8 h-24 w-full" />
      ) : (
        <>
          <div className="mt-7 grid grid-cols-3 divide-x divide-white/10 text-center">
            <TimeValue value={Math.round(advanced.meanStartToPaymentMinutes * 60)} label="segundos" />
            <TimeValue value={Math.round(advanced.meanStartToPaymentMinutes)} label="minutos" />
            <TimeValue value={Math.round(advanced.meanStartToPaymentMinutes / 60)} label="horas" />
          </div>
          <p className="mt-8 border-t border-white/10 pt-5 text-center text-[11px] font-mono uppercase tracking-[0.16em] text-gray-600">
            Dataset: pagamentos confirmados
          </p>
        </>
      )}
    </section>
  )
}

function RateCard({
  icon: Icon,
  title,
  metric,
  helper,
  tone,
  loading,
}: {
  icon: LucideIcon
  title: string
  metric: { rate: number; numerator: number; denominator: number }
  helper: string
  tone: 'green' | 'orange' | 'yellow' | 'purple' | 'blue' | 'red'
  loading: boolean
}) {
  const toneClass = getToneClass(tone)
  return (
    <section className="rounded-[14px] border border-white/10 bg-[#0c0d10] p-6">
      <div className="flex items-center gap-4">
        <span className={cn('flex h-12 w-12 items-center justify-center rounded-xl border', toneClass)}>
          <Icon size={20} aria-hidden="true" />
        </span>
        <h3 className="text-xl font-black text-white">{title}</h3>
      </div>
      {loading ? (
        <LoaderBlock className="mt-8 h-20 w-full" />
      ) : (
        <>
          <p className="mt-7 text-5xl font-black text-white">{metric.rate}%</p>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.08em] text-gray-600">
            {metric.numerator} de {metric.denominator} {helper}
          </p>
          <div className="mt-7 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-neon-purple" style={{ width: `${Math.min(100, metric.rate)}%` }} />
          </div>
        </>
      )}
    </section>
  )
}

function ValueCard({
  icon: Icon,
  title,
  value,
  helper,
  tone,
  loading,
}: {
  icon: LucideIcon
  title: string
  value: string
  helper: string
  tone: 'green' | 'purple' | 'orange'
  loading: boolean
}) {
  const textClass = tone === 'green' ? 'text-neon-green' : tone === 'purple' ? 'text-neon-purple' : 'text-neon-orange'
  return (
    <section className="overflow-hidden rounded-[14px] border border-white/10 bg-[#0c0d10] p-6">
      <PanelHeader icon={Icon} title={title} subtitle="" />
      {loading ? (
        <LoaderBlock className="mt-12 h-20 w-full" />
      ) : (
        <div className="mt-20 text-center">
          <p className={cn('text-6xl font-black tracking-tight', textClass)}>{value}</p>
          <p className="mt-5 text-[12px] font-black uppercase tracking-[0.18em] text-gray-500">{helper}</p>
        </div>
      )}
    </section>
  )
}

function CountersCard({
  counters,
  loading,
}: {
  counters: AnalyticsAdvancedMetrics['userCounters']
  loading: boolean
}) {
  return (
    <section className="rounded-[14px] border border-white/10 bg-[#0c0d10] p-6">
      <PanelHeader icon={Users} title="Contadores de Usuários" subtitle="Por tipo" />
      {loading ? (
        <LoaderBlock className="mt-8 h-44 w-full" />
      ) : counters.length === 0 ? (
        <EmptyState label="Nenhum contador disponivel" />
      ) : (
        <div className="mt-8 space-y-3">
          {counters.map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3">
              <span className="text-sm font-bold text-gray-300">{item.label}</span>
              <span className={cn('font-mono text-lg font-black', getCounterText(item.tone))}>{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function PanelHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-neon-purple/20 bg-neon-purple/10 text-neon-purple">
        <Icon size={21} aria-hidden="true" />
      </span>
      <div>
        <h3 className="text-xl font-black text-white">{title}</h3>
        {subtitle && <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.22em] text-gray-500">{subtitle}</p>}
      </div>
    </div>
  )
}

function FunnelStep({ label, value, rate }: { label: string; value: number; rate: number }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">{label}</p>
      <div className="mt-5 flex h-20 items-center justify-center rounded-full bg-gradient-to-r from-neon-purple/70 to-neon-magenta/40" style={{ opacity: Math.max(0.22, rate / 100) }}>
        <span className="text-2xl font-black text-white">{rate}%</span>
      </div>
      <p className="mt-4 text-2xl font-black text-white">{value}</p>
    </div>
  )
}

function FunnelRate({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-2 text-xl font-black text-neon-purple">{value}%</p>
    </div>
  )
}

function TimeValue({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-4xl font-black text-white">{value}</p>
      <p className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-gray-600">{label}</p>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[140px] items-center justify-center text-center text-sm text-gray-500">
      {label}
    </div>
  )
}

function LoaderBlock({ className }: { className: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-white/[0.06]', className)} />
}

function makePoints<T extends Record<string, string | number>>(
  data: T[],
  key: keyof T,
  width: number,
  height: number,
  padding: number,
  max: number,
) {
  return data
    .map((item, index) => {
      const x = getX(index, data.length, width, padding)
      const y = getY(Number(item[key] ?? 0), height, padding, max)
      return `${x},${y}`
    })
    .join(' ')
}

function getX(index: number, length: number, width: number, padding: number) {
  if (length <= 1) return width / 2
  return padding + (index / (length - 1)) * (width - padding * 2)
}

function getY(value: number, height: number, padding: number, max: number) {
  return height - padding - (value / max) * (height - padding * 2)
}

function getBestHour(hours: AnalyticsTimeSeries['hourly']) {
  const best = hours.reduce((winner, item) => (item.paid > winner.paid ? item : winner), hours[0])
  return `${best?.hour ?? '0h'} (${best?.paid ?? 0} vendas)`
}

function sumSeries<T extends Record<string, string | number>>(items: T[], key: keyof T) {
  return items.reduce((total, item) => total + Number(item[key] ?? 0), 0)
}

function buildSparkTrend<T extends Record<string, string | number>>(
  items: T[],
  labelKey: keyof T,
  valueKey: keyof T,
) {
  if (items.length === 0) return [{ day: '0', value: 0 }]

  return items.map((item, index) => ({
    day: String(item[labelKey] ?? index + 1),
    value: Number(item[valueKey] ?? 0),
  }))
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format((Number(cents) || 0) / 100)
}

function getToneClass(tone: 'green' | 'orange' | 'yellow' | 'purple' | 'blue' | 'red') {
  const classes = {
    green: 'border-neon-green/25 bg-neon-green/10 text-neon-green',
    orange: 'border-neon-orange/25 bg-neon-orange/10 text-neon-orange',
    yellow: 'border-yellow-400/25 bg-yellow-400/10 text-yellow-300',
    purple: 'border-neon-purple/25 bg-neon-purple/10 text-neon-purple',
    blue: 'border-neon-purple/25 bg-neon-purple/10 text-neon-purple',
    red: 'border-red-500/25 bg-red-500/10 text-red-300',
  }
  return classes[tone]
}

function getCounterText(tone: AnalyticsAdvancedMetrics['userCounters'][number]['tone']) {
  const classes = {
    green: 'text-neon-green',
    purple: 'text-neon-purple',
    orange: 'text-neon-orange',
    blue: 'text-neon-purple',
    gray: 'text-gray-300',
    red: 'text-red-300',
  }
  return classes[tone]
}

function isAnalyticsSchemaMissing(message: string) {
  return /analytics_revenue_events|source|utm_|device_type|city|schema cache|relation .* does not exist/i.test(message)
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}
