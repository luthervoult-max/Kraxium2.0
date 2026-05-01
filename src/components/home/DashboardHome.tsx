import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bot as BotIcon,
  CreditCard,
  DollarSign,
  GitBranch,
  Loader2,
  MoreVertical,
  ShoppingCart,
  Target,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { listBots, type Bot as BotRow } from '@/lib/api/bots'
import {
  getAnalyticsDashboard,
  type AnalyticsDashboard,
  type AnalyticsOverview,
  type AnalyticsRankingItem,
} from '@/lib/api/analytics'
import type { AccountProfile } from '@/lib/api/profile'
import type { Page } from '@/lib/pages'

type Accent = 'purple' | 'green' | 'pink' | 'gold' | 'cyan'

interface DashboardBundle {
  today: AnalyticsDashboard
  week: AnalyticsDashboard
  month: AnalyticsDashboard
}

interface BotSummary {
  interactions: number
  starts: number
  confirmedPayments: number
  revenueConfirmedCents: number
  leadSaleRate: number
}

interface KpiCardData {
  label: string
  icon: LucideIcon
  today: string
  week: string
  month: string
  percentage: number
  percentageLabel: string
  accent: Accent
}

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

const ACCENT_PALETTE: Record<
  Accent,
  { color: string; soft: string; border: string; shadow: string }
> = {
  purple: {
    color: '#a855f7',
    soft: 'rgba(168,85,247,0.13)',
    border: 'rgba(168,85,247,0.35)',
    shadow: '0 0 28px rgba(168,85,247,0.18)',
  },
  green: {
    color: '#22c55e',
    soft: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.28)',
    shadow: '0 0 26px rgba(34,197,94,0.16)',
  },
  pink: {
    color: '#ec4899',
    soft: 'rgba(236,72,153,0.12)',
    border: 'rgba(236,72,153,0.3)',
    shadow: '0 0 26px rgba(236,72,153,0.16)',
  },
  gold: {
    color: '#f59e0b',
    soft: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.28)',
    shadow: '0 0 26px rgba(245,158,11,0.14)',
  },
  cyan: {
    color: '#22d3ee',
    soft: 'rgba(34,211,238,0.12)',
    border: 'rgba(34,211,238,0.28)',
    shadow: '0 0 26px rgba(34,211,238,0.14)',
  },
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format((Number(cents) || 0) / 100)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 10000 ? 1 : 0,
  }).format(Number(value) || 0)
}

function formatPercent(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0
  const decimals = normalized > 0 && normalized < 10 ? 1 : 0
  return `${normalized.toFixed(decimals).replace('.', ',')}%`
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function rate(value: number, total: number): number {
  if (!total) return 0
  return (value / total) * 100
}

function buildBotHandle(bot: BotRow): string {
  if (bot.telegram_username) return `@${bot.telegram_username}`
  if (bot.telegram_first_name) return bot.telegram_first_name
  return 'bot sem usuário'
}

function getGreeting(date = new Date()) {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getDashboardDisplayName(profile?: AccountProfile | null, userEmail?: string | null) {
  const preferredName = profile?.nickname || profile?.fullName || userEmail?.split('@')[0] || 'cliente'
  return preferredName.trim() || 'cliente'
}

function getDateLabel() {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  }).format(new Date())
}

function KpiCard({ label, icon: Icon, today, week, month, percentage, percentageLabel, accent }: KpiCardData) {
  const palette = ACCENT_PALETTE[accent]
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const dash = (clampPercent(percentage) / 100) * circumference

  return (
    <article
      className="relative min-h-[218px] overflow-hidden rounded-[22px] p-6"
      style={{
        background:
          'radial-gradient(circle at 15% 0%, rgba(168,85,247,0.14), transparent 34%), #0b0c11',
        border: `1px solid ${palette.border}`,
        boxShadow: palette.shadow,
      }}
    >
      <div
        className="absolute right-[-42px] top-[-46px] h-32 w-32 rounded-full blur-3xl"
        style={{ background: palette.soft }}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px]"
            style={{
              background: palette.soft,
              border: `1px solid ${palette.border}`,
              color: palette.color,
            }}
          >
            <Icon size={22} aria-hidden />
          </span>
          <div>
            <p className="text-[15px] font-bold leading-tight text-white">{label}</p>
            <p className="mt-1 text-[12px] font-medium text-slate-500">Hoje</p>
          </div>
        </div>

        <div className="relative h-[82px] w-[82px] shrink-0">
          <svg width="82" height="82" viewBox="0 0 88 88" className="-rotate-90">
            <circle cx="44" cy="44" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <circle
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              stroke={palette.color}
              strokeLinecap="round"
              strokeWidth="8"
              strokeDasharray={`${dash} ${circumference}`}
              style={{ filter: `drop-shadow(0 0 6px ${palette.color})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span className="text-[16px] font-black text-white">{formatPercent(percentage)}</span>
            <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.16em] text-slate-500">
              {percentageLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="relative mt-4">
        <div className="font-display text-[40px] font-black leading-none text-white">{today}</div>
      </div>

      <div className="relative mt-5 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between text-[14px]">
          <span className="font-medium text-slate-400">7 dias</span>
          <span className="font-bold text-white">{week}</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[14px]">
          <span className="font-medium text-slate-400">30 dias</span>
          <span className="font-bold text-white">{month}</span>
        </div>
      </div>
    </article>
  )
}

interface PerformancePanelProps {
  dashboard: AnalyticsDashboard | null
}

function PerformancePanel({ dashboard }: PerformancePanelProps) {
  const overview = dashboard?.overview ?? emptyOverview
  const points = dashboard?.timeSeries.calendar ?? []
  const values = points.map((point) => point.revenueCents)
  const maxValue = Math.max(...values, 0)
  const hasData = maxValue > 0 || points.some((point) => point.generated > 0 || point.paid > 0)
  const width = 720
  const height = 230
  const chartTop = 28
  const chartBottom = 188
  const step = points.length > 1 ? width / (points.length - 1) : width
  const linePoints = points.map((point, index) => {
    const x = index * step
    const y = maxValue > 0
      ? chartBottom - (point.revenueCents / maxValue) * (chartBottom - chartTop)
      : chartBottom
    return `${x},${y}`
  })

  return (
    <section
      className="relative min-h-[360px] overflow-hidden rounded-[26px] p-7"
      style={{
        background:
          'radial-gradient(circle at 20% 15%, rgba(168,85,247,0.12), transparent 38%), radial-gradient(circle at 80% 80%, rgba(34,197,94,0.08), transparent 34%), #0b0c11',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[26px] font-black leading-tight text-white">Seu Desempenho</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Receita confirmada ao longo do mês</p>
        </div>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-slate-400 hover:border-purple-400/40 hover:text-purple-200"
          aria-label="Mais opções do desempenho"
        >
          <MoreVertical size={18} aria-hidden />
        </button>
      </div>

      <div className="relative min-h-[220px]">
        {hasData ? (
          <svg viewBox={`0 0 ${width} ${height}`} className="h-[230px] w-full overflow-visible" role="img" aria-label="Gráfico de desempenho mensal">
            <defs>
              <linearGradient id="performanceArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(168,85,247,0.36)" />
                <stop offset="100%" stopColor="rgba(168,85,247,0)" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3].map((line) => {
              const y = chartTop + ((chartBottom - chartTop) / 3) * line
              return (
                <line
                  key={line}
                  x1="0"
                  x2={width}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="6 10"
                />
              )
            })}
            {linePoints.length > 1 && (
              <>
                <polygon
                  points={`0,${chartBottom} ${linePoints.join(' ')} ${width},${chartBottom}`}
                  fill="url(#performanceArea)"
                />
                <polyline
                  points={linePoints.join(' ')}
                  fill="none"
                  stroke="#a855f7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="4"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.65))' }}
                />
              </>
            )}
            {points.map((point, index) => {
              const barHeight = maxValue > 0 ? Math.max(4, (point.revenueCents / maxValue) * 74) : 4
              return (
                <rect
                  key={point.date}
                  x={index * step - 3}
                  y={chartBottom + 18 - barHeight}
                  width="6"
                  height={barHeight}
                  rx="3"
                  fill={point.paid > 0 ? '#22c55e' : 'rgba(168,85,247,0.55)'}
                />
              )
            })}
          </svg>
        ) : (
          <div className="flex min-h-[220px] items-center justify-center text-center">
            <div>
              <BarChart3 size={38} className="mx-auto mb-4 text-purple-300/70" aria-hidden />
              <p className="text-[18px] font-bold text-slate-300">Nenhum dado de desempenho disponível</p>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Assim que os bots gerarem vendas ou pagamentos, o gráfico aparece aqui.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MiniTotal label="Total / starts" value={formatNumber(overview.starts)} />
        <MiniTotal label="Vendas geradas" value={formatCurrency(overview.revenueGeneratedCents)} tone="purple" />
        <MiniTotal label="Vendas pagas" value={formatCurrency(overview.revenueConfirmedCents)} tone="green" />
      </div>
    </section>
  )
}

function MiniTotal({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'purple' | 'green' }) {
  const color = tone === 'green' ? '#22c55e' : tone === 'purple' ? '#a855f7' : '#e2e8f0'
  return (
    <div className="rounded-[16px] border border-white/10 bg-white/[0.04] px-5 py-4 text-center">
      <div className="text-[13px] font-bold text-slate-400">{label}</div>
      <div className="mt-2 text-[24px] font-black leading-none" style={{ color }}>
        {value}
      </div>
    </div>
  )
}

interface RankingPanelProps {
  items: AnalyticsRankingItem[]
  fallbackItems: AnalyticsRankingItem[]
  totalRevenueCents: number
  onOpenAnalytics: () => void
}

function RankingPanel({ items, fallbackItems, totalRevenueCents, onOpenAnalytics }: RankingPanelProps) {
  const ranking = items.length > 0 ? items : fallbackItems
  const title = items.length > 0 ? 'Top 5 Melhores Bots' : 'Top 5 Melhores Fluxos'

  return (
    <aside
      className="flex min-h-[360px] flex-col rounded-[26px] p-6"
      style={{
        background:
          'radial-gradient(circle at 20% 0%, rgba(168,85,247,0.12), transparent 34%), #0b0c11',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-[#a855f7]" aria-hidden />
            <h2 className="text-[20px] font-black uppercase leading-tight text-white">{title}</h2>
          </div>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Mês atual</p>
        </div>
        <button
          type="button"
          onClick={onOpenAnalytics}
          className="flex items-center gap-1 border-0 bg-transparent text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 hover:text-purple-200"
        >
          Ver todos
          <ArrowUpRight size={14} aria-hidden />
        </button>
      </div>

      <div className="flex-1 space-y-3">
        {ranking.length === 0 ? (
          <div className="flex min-h-[210px] items-center justify-center rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] px-5 text-center">
            <p className="text-sm font-semibold leading-6 text-slate-500">
              Ainda não há vendas confirmadas para montar o ranking.
            </p>
          </div>
        ) : (
          ranking.slice(0, 5).map((item, index) => (
            <RankingRow key={item.id} item={item} index={index} />
          ))
        )}
      </div>

      <div className="mt-5 rounded-[18px] border border-purple-400/30 bg-purple-500/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-black uppercase tracking-[0.12em] text-purple-200">Sua conta</p>
            <p className="mt-1 text-xs text-slate-500">Resumo de receita confirmada</p>
          </div>
          <div className="text-right text-[20px] font-black text-white">{formatCurrency(totalRevenueCents)}</div>
        </div>
      </div>
    </aside>
  )
}

function RankingRow({ item, index }: { item: AnalyticsRankingItem; index: number }) {
  const initials = item.label
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || `${index + 1}`

  return (
    <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3 last:border-0">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-[15px] font-black"
        style={{
          borderColor: index === 0 ? 'rgba(34,197,94,0.65)' : 'rgba(168,85,247,0.35)',
          background: index === 0 ? 'rgba(34,197,94,0.13)' : 'rgba(168,85,247,0.12)',
          color: index === 0 ? '#22c55e' : '#c084fc',
        }}
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-black text-white">{item.label}</p>
        <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">
          RNK-{String(index + 1).padStart(2, '0')} · {formatNumber(item.value)} venda(s)
        </p>
      </div>
      <div className="shrink-0 text-right text-[15px] font-black text-[#22c55e]">
        {formatCurrency(item.amountCents ?? 0)}
      </div>
    </div>
  )
}

function ImportantMetricCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: LucideIcon
  label: string
  value: string
  sub: string
  accent: Accent
}) {
  const palette = ACCENT_PALETTE[accent]
  return (
    <article className="flex min-h-[136px] items-center gap-5 rounded-[22px] border border-white/10 bg-[#0b0c11] p-6">
      <span
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[17px]"
        style={{ background: palette.soft, border: `1px solid ${palette.border}`, color: palette.color }}
      >
        <Icon size={28} aria-hidden />
      </span>
      <div>
        <p className="text-[16px] font-black text-white">{label}</p>
        <p className="mt-2 text-[32px] font-black leading-none text-white">{value}</p>
        <p className="mt-2 flex items-center gap-1 text-[13px] font-bold" style={{ color: palette.color }}>
          <ArrowUpRight size={14} aria-hidden />
          {sub}
        </p>
      </div>
    </article>
  )
}

interface BotCardProps {
  bot: BotRow
  summary?: BotSummary
  onManage: () => void
}

function BotCard({ bot, summary, onManage }: BotCardProps) {
  const isActive = bot.connection_status === 'connected' || Boolean(bot.telegram_username)
  const statusColor = isActive ? '#22c55e' : '#f59e0b'
  const statusText = isActive ? 'Ativo' : 'Pausado'
  const flowName = bot.webhook_enabled ? 'Webhook ativo' : 'Sem fluxo conectado'

  return (
    <article
      className="group rounded-[22px] border border-white/10 bg-[#0b0c11] p-5 transition-all hover:border-purple-400/40 hover:bg-purple-500/[0.04]"
      role="button"
      tabIndex={0}
      onClick={onManage}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onManage()
        }
      }}
    >
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-purple-400/30 bg-purple-500/15 text-purple-300">
          <BotIcon size={20} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[17px] font-black text-white">{bot.name}</h3>
          <p className="mt-1 truncate text-[13px] font-medium text-slate-500">{buildBotHandle(bot)}</p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]"
          style={{ background: `${statusColor}18`, border: `1px solid ${statusColor}45`, color: statusColor }}
        >
          {statusText}
        </span>
      </div>

      <div className="grid grid-cols-2 overflow-hidden rounded-[16px] border border-white/10">
        <BotStat label="Interações" value={formatNumber(summary?.interactions ?? 0)} />
        <BotStat label="Vendas" value={formatNumber(summary?.confirmedPayments ?? 0)} />
        <BotStat label="Receita" value={formatCurrency(summary?.revenueConfirmedCents ?? 0)} />
        <BotStat label="Conversão" value={formatPercent(summary?.leadSaleRate ?? 0)} />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="truncate text-[13px] font-medium text-slate-500">
          Fluxo: <span className="text-slate-300">{flowName}</span>
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onManage()
          }}
          className="shrink-0 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-[12px] font-black text-purple-200 transition group-hover:border-purple-300/60"
        >
          Gerenciar
        </button>
      </div>
    </article>
  )
}

function BotStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-r border-white/10 px-4 py-3 last:border-r-0 even:border-r-0 [&:nth-child(n+3)]:border-b-0">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">{label}</p>
      <p className="mt-1.5 text-[18px] font-black text-white">{value}</p>
    </div>
  )
}

interface DashboardHomeProps {
  isMobile: boolean
  onNavigate: (page: Page) => void
  onSelectBot: (botId: string) => void
  profile?: AccountProfile | null
  userEmail?: string | null
}

export default function DashboardHome({
  isMobile,
  onNavigate,
  onSelectBot,
  profile,
  userEmail,
}: DashboardHomeProps) {
  const [bots, setBots] = useState<BotRow[]>([])
  const [botSummaries, setBotSummaries] = useState<Record<string, BotSummary>>({})
  const [dashboards, setDashboards] = useState<DashboardBundle | null>(null)
  const [loadingBots, setLoadingBots] = useState(true)
  const [loadingDashboard, setLoadingDashboard] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(() => new Date())

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(new Date()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      setLoadingDashboard(true)
      try {
        const [today, week, month] = await Promise.all([
          getAnalyticsDashboard({ timeRange: 'today' }),
          getAnalyticsDashboard({ timeRange: 'week' }),
          getAnalyticsDashboard({ timeRange: 'month' }),
        ])
        if (!active) return
        setDashboards({ today, week, month })
        setError(null)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar métricas do painel')
      } finally {
        if (active) setLoadingDashboard(false)
      }
    }

    void loadDashboard()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadBots() {
      setLoadingBots(true)
      try {
        const data = await listBots()
        if (!active) return
        setBots(data)

        const visibleBots = data.slice(0, 6)
        const summaries = await Promise.all(
          visibleBots.map(async (bot) => {
            const analytics = await getAnalyticsDashboard({ timeRange: 'month', botId: bot.id })
            const overview = analytics.overview
            return [
              bot.id,
              {
                interactions: overview.interactions,
                starts: overview.starts,
                confirmedPayments: overview.confirmedPayments,
                revenueConfirmedCents: overview.revenueConfirmedCents,
                leadSaleRate: overview.leadSaleRate,
              },
            ] as const
          }),
        )
        if (!active) return
        setBotSummaries(Object.fromEntries(summaries))
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar bots')
      } finally {
        if (active) setLoadingBots(false)
      }
    }

    void loadBots()
    return () => {
      active = false
    }
  }, [])

  const todayOverview = dashboards?.today.overview ?? emptyOverview
  const weekOverview = dashboards?.week.overview ?? emptyOverview
  const monthOverview = dashboards?.month.overview ?? emptyOverview
  const greeting = getGreeting(currentTime)
  const displayName = getDashboardDisplayName(profile, userEmail)

  const kpis = useMemo<KpiCardData[]>(() => {
    const generatedRate = rate(monthOverview.generatedPayments, monthOverview.starts)
    return [
      {
        label: 'Total de Starts',
        icon: Zap,
        today: formatNumber(todayOverview.starts),
        week: formatNumber(weekOverview.starts),
        month: formatNumber(monthOverview.starts),
        percentage: monthOverview.startRate,
        percentageLabel: 'início',
        accent: 'purple',
      },
      {
        label: 'Receita Gerada',
        icon: DollarSign,
        today: formatCurrency(todayOverview.revenueGeneratedCents),
        week: formatCurrency(weekOverview.revenueGeneratedCents),
        month: formatCurrency(monthOverview.revenueGeneratedCents),
        percentage: generatedRate,
        percentageLabel: 'gerado',
        accent: 'cyan',
      },
      {
        label: 'Receita Confirmada',
        icon: ShoppingCart,
        today: formatCurrency(todayOverview.revenueConfirmedCents),
        week: formatCurrency(weekOverview.revenueConfirmedCents),
        month: formatCurrency(monthOverview.revenueConfirmedCents),
        percentage: monthOverview.approvalRate,
        percentageLabel: 'aprovação',
        accent: 'green',
      },
      {
        label: 'Taxa de Conversão',
        icon: Target,
        today: formatPercent(todayOverview.leadSaleRate),
        week: formatPercent(weekOverview.leadSaleRate),
        month: formatPercent(monthOverview.leadSaleRate),
        percentage: monthOverview.leadSaleRate,
        percentageLabel: 'venda',
        accent: 'pink',
      },
    ]
  }, [monthOverview, todayOverview, weekOverview])

  const importantMetrics = [
    {
      icon: Target,
      label: 'Taxa de Conversão',
      value: formatPercent(monthOverview.leadSaleRate),
      sub: `${formatNumber(monthOverview.confirmedPayments)} vendas pagas no mês`,
      accent: 'purple' as const,
    },
    {
      icon: CreditCard,
      label: 'Ticket Médio',
      value: formatCurrency(monthOverview.averageTicketCents),
      sub: 'média por venda confirmada',
      accent: 'green' as const,
    },
    {
      icon: ShoppingCart,
      label: 'Total de Vendas',
      value: formatNumber(monthOverview.confirmedPayments),
      sub: `${formatPercent(monthOverview.approvalRate)} de aprovação`,
      accent: 'pink' as const,
    },
    {
      icon: Activity,
      label: 'Interações',
      value: formatNumber(monthOverview.interactions),
      sub: `${formatNumber(monthOverview.starts)} starts registrados`,
      accent: 'gold' as const,
    },
  ]

  const quickActions: Array<{
    label: string
    color: string
    icon: LucideIcon
    onClick: () => void
  }> = [
    { label: 'Novo Fluxo', color: '#a855f7', icon: GitBranch, onClick: () => onNavigate('flowIntel') },
    { label: 'Adicionar Bot', color: '#22c55e', icon: BotIcon, onClick: () => onNavigate('bots') },
    { label: 'Ver Métricas', color: '#ec4899', icon: BarChart3, onClick: () => onNavigate('analytics') },
    { label: 'Ver Usuários', color: '#f59e0b', icon: Users, onClick: () => onNavigate('users') },
  ]

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ padding: isMobile ? '18px 14px 28px' : '26px 32px 38px' }}
    >
      <header className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.35em] text-purple-300">
            Dashboard
          </p>
          <h1 className="font-display text-[38px] font-black leading-none text-white sm:text-[46px]">
            {greeting}, {displayName}
          </h1>
          <p className="mt-3 text-[17px] font-medium capitalize text-slate-400">{getDateLabel()}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('analytics')}
            className="rounded-full border border-purple-400/40 bg-purple-500/15 px-5 py-3 text-[14px] font-black text-purple-100 shadow-[0_0_24px_rgba(168,85,247,0.18)] hover:border-purple-300/70"
          >
            Ver análise completa
          </button>
          <button
            type="button"
            onClick={() => onNavigate('bots')}
            className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-[14px] font-black text-slate-200 hover:border-purple-400/40"
          >
            Adicionar bot
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-5 rounded-[18px] border border-red-400/25 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-200">
          {error}
        </div>
      )}

      {loadingDashboard ? (
        <div className="mb-7 flex min-h-[220px] items-center justify-center rounded-[24px] border border-white/10 bg-[#0b0c11] text-slate-400">
          <Loader2 size={22} className="mr-3 animate-spin text-purple-300" aria-hidden />
          Carregando métricas reais...
        </div>
      ) : (
        <>
          <section className="mb-8 grid gap-5 xl:grid-cols-4 md:grid-cols-2">
            {kpis.map((kpi) => (
              <KpiCard key={kpi.label} {...kpi} />
            ))}
          </section>

          <section className="mb-8 grid gap-7 xl:grid-cols-[minmax(0,2.05fr)_minmax(360px,0.95fr)]">
            <PerformancePanel dashboard={dashboards?.month ?? null} />
            <RankingPanel
              items={dashboards?.month.rankings.topBots ?? []}
              fallbackItems={dashboards?.month.rankings.topFlows ?? []}
              totalRevenueCents={monthOverview.revenueConfirmedCents}
              onOpenAnalytics={() => onNavigate('analytics')}
            />
          </section>

          <section
            className="mb-8 rounded-[26px] p-6"
            style={{
              background:
                'radial-gradient(circle at 80% 10%, rgba(168,85,247,0.1), transparent 30%), #0b0c11',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="mb-5">
              <h2 className="text-[26px] font-black leading-tight text-white">Métricas Importantes</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Resumo real do mês atual</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
              {importantMetrics.map((metric) => (
                <ImportantMetricCard key={metric.label} {...metric} />
              ))}
            </div>
          </section>
        </>
      )}

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[24px] font-black text-white">Meus Bots</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {bots.length} bot(s) conectado(s) à operação
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('bots')}
            className="rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-[13px] font-black text-purple-200 hover:border-purple-300/60"
          >
            Ver todos
          </button>
        </div>

        {loadingBots ? (
          <div className="flex min-h-[170px] items-center justify-center rounded-[22px] border border-white/10 bg-[#0b0c11] text-slate-400">
            <Loader2 size={20} className="mr-3 animate-spin text-purple-300" aria-hidden />
            Carregando bots...
          </div>
        ) : bots.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-purple-400/30 bg-purple-500/10 p-8 text-center">
            <BotIcon size={36} className="mx-auto mb-4 text-purple-300" aria-hidden />
            <p className="text-[20px] font-black text-white">Nenhum bot cadastrado ainda</p>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              Crie seu primeiro bot para começar a registrar starts, interações e vendas reais.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('bots')}
              className="mt-5 rounded-full border border-purple-400/40 bg-purple-500/20 px-5 py-3 text-sm font-black text-purple-100"
            >
              Criar primeiro bot
            </button>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-3 md:grid-cols-2">
            {bots.slice(0, 6).map((bot) => (
              <BotCard
                key={bot.id}
                bot={bot}
                summary={botSummaries[bot.id]}
                onManage={() => {
                  onSelectBot(bot.id)
                  onNavigate('bots')
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-[24px] font-black text-white">Ações Rápidas</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Atalhos para operar a plataforma</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="flex min-h-[108px] items-center gap-4 rounded-[22px] border border-white/10 bg-[#0b0c11] p-5 text-left transition hover:-translate-y-0.5 hover:border-purple-400/40"
              >
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px]"
                  style={{
                    background: `${action.color}1f`,
                    border: `1px solid ${action.color}55`,
                    color: action.color,
                  }}
                >
                  <Icon size={24} aria-hidden />
                </span>
                <span className="text-[16px] font-black text-white">{action.label}</span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
