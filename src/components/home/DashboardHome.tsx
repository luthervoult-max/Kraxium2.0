import { useEffect, useMemo, useState } from 'react'
import { Bot as BotIcon, CreditCard, GitBranch, Loader2, Users } from 'lucide-react'
import { listBots, type Bot as BotRow } from '@/lib/api/bots'
import {
  getAnalyticsDashboard,
  type AnalyticsDashboard,
  type AnalyticsOverview,
} from '@/lib/api/analytics'
import type { Page } from '@/lib/pages'

type Accent = 'purple' | 'green' | 'pink' | 'gold'

interface KpiCardData {
  label: string
  value: string
  sub: string
  pct: number
  accent: Accent
  loading?: boolean
}

interface BotMetricSummary {
  interactions: number
  starts: number
  confirmedPayments: number
  revenueConfirmedCents: number
  topFlowLabel: string | null
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
  { c: string; label: string; border: string; track: string; glow?: string }
> = {
  purple: {
    c: '#a855f7',
    label: '#c084fc',
    border: 'rgba(168,85,247,0.34)',
    track: 'rgba(168,85,247,0.14)',
    glow: '0 0 12px rgba(168,85,247,0.45)',
  },
  green: {
    c: '#39ff14',
    label: '#39ff14',
    border: 'rgba(57,255,20,0.22)',
    track: 'rgba(57,255,20,0.1)',
    glow: '0 0 12px rgba(57,255,20,0.34)',
  },
  pink: {
    c: '#ff2a9d',
    label: '#f472b6',
    border: 'rgba(255,42,157,0.24)',
    track: 'rgba(255,42,157,0.1)',
    glow: '0 0 12px rgba(255,42,157,0.3)',
  },
  gold: {
    c: '#f59e0b',
    label: '#fbbf24',
    border: 'rgba(245,158,11,0.25)',
    track: 'rgba(245,158,11,0.1)',
  },
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(Number(n) || 0)
}

function formatCompactNumber(n: number): string {
  return new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(n) || 0)
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format((Number(cents) || 0) / 100)
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) return numerator > 0 ? 100 : 0
  return clampPercent((numerator / denominator) * 100)
}

function toBotMetricSummary(dashboard: AnalyticsDashboard): BotMetricSummary {
  return {
    interactions: dashboard.overview.interactions,
    starts: dashboard.overview.starts,
    confirmedPayments: dashboard.overview.confirmedPayments,
    revenueConfirmedCents: dashboard.overview.revenueConfirmedCents,
    topFlowLabel: dashboard.rankings.topFlows[0]?.label ?? null,
  }
}

function KpiCard({ label, value, sub, pct, accent, loading }: KpiCardData) {
  const a = ACCENT_PALETTE[accent]
  const radius = 33
  const circ = 2 * Math.PI * radius
  const dash = (clampPercent(pct) / 100) * circ

  return (
    <div
      className="flex min-h-[176px] flex-col justify-between rounded-[18px] p-5 transition-colors"
      style={{
        background: 'linear-gradient(180deg,#0c0d10 0%,#08090b 100%)',
        border: `1px solid ${a.border}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div
        className="text-[12px] font-black uppercase text-slate-400"
        style={{ letterSpacing: '0.12em' }}
      >
        {label}
      </div>
      <div className="mt-4 flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0">
          <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="40" cy="40" r={radius} fill="none" stroke={a.track} strokeWidth="8" />
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke={a.c}
              strokeWidth="8"
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
              style={{ filter: a.glow ? `drop-shadow(${a.glow})` : 'none' }}
            />
          </svg>
          <div
            className="font-display absolute inset-0 flex items-center justify-center text-sm font-black"
            style={{ color: a.c }}
          >
            {loading ? '...' : `${clampPercent(pct)}%`}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="font-display break-words text-[clamp(1.75rem,2.5vw,2.55rem)] font-black leading-none text-white"
            style={{ textShadow: `0 0 18px ${a.c}44` }}
          >
            {loading ? 'Carregando' : value}
          </div>
          <div className="mt-3 text-[13px] font-semibold leading-5 text-slate-400">{sub}</div>
        </div>
      </div>
    </div>
  )
}

interface BotCardProps {
  bot: BotRow
  metrics: BotMetricSummary | null
  loadingMetrics: boolean
  onManage: () => void
}

function BotCard({ bot, metrics, loadingMetrics, onManage }: BotCardProps) {
  const isActive = Boolean(bot.telegram_bot_id || bot.webhook_enabled)
  const statusColor = isActive ? '#39ff14' : '#f59e0b'
  const statusText = isActive ? 'Ativo' : 'Pausado'
  const handle = bot.telegram_username ? `@${bot.telegram_username}` : bot.telegram_bot_id ? `ID ${bot.telegram_bot_id}` : 'sem telegram'
  const flowName = metrics?.topFlowLabel ?? (bot.webhook_enabled ? 'Webhook ativo' : 'Sem fluxo conectado')

  return (
    <div
      className="rounded-[18px] p-5 transition-colors"
      style={{
        background: 'linear-gradient(180deg,#0c0d10 0%,#08090b 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        cursor: 'pointer',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
      onClick={onManage}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(168,85,247,0.45)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onManage()
        }
      }}
    >
      <div className="mb-5 flex items-center gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px]"
          style={{
            background: 'linear-gradient(135deg,#111827,#2e1065)',
            border: '1px solid rgba(168,85,247,0.34)',
          }}
        >
          <BotIcon size={21} aria-hidden className="text-[#c084fc]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 truncate text-base font-black text-white">{bot.name}</div>
          <div className="truncate font-mono text-[12px] text-slate-500">{handle}</div>
        </div>
        <div
          className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1"
          style={{
            border: `1px solid ${statusColor}44`,
            background: `${statusColor}11`,
          }}
        >
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: statusColor,
              boxShadow: isActive ? `0 0 7px ${statusColor}` : 'none',
            }}
          />
          <span
            className="text-[10px] font-black uppercase"
            style={{ letterSpacing: '0.1em', color: statusColor }}
          >
            {statusText}
          </span>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <BotStat label="Interações" value={loadingMetrics ? '...' : formatCompactNumber(metrics?.interactions ?? 0)} color="#c084fc" />
        <BotStat label="Vendas" value={loadingMetrics ? '...' : formatNumber(metrics?.confirmedPayments ?? 0)} color="#39ff14" />
        <BotStat label="Receita" value={loadingMetrics ? '...' : formatCurrency(metrics?.revenueConfirmedCents ?? 0)} color="#ff2a9d" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[12px] font-medium text-slate-500">
          Fluxo: <span className="text-slate-300">{flowName}</span>
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onManage()
          }}
          className="rounded-[9px] px-4 py-2 text-[12px] font-black"
          style={{
            border: '1px solid rgba(168,85,247,0.4)',
            background: 'rgba(168,85,247,0.12)',
            color: '#c084fc',
          }}
        >
          Gerenciar
        </button>
      </div>
    </div>
  )
}

function BotStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-[12px] px-3 py-3"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="mb-1 text-[10px] font-black uppercase text-slate-600"
        style={{ letterSpacing: '0.08em' }}
      >
        {label}
      </div>
      <div className="font-display truncate text-[18px] font-black" style={{ color }}>
        {value}
      </div>
    </div>
  )
}

interface DashboardHomeProps {
  isMobile: boolean
  onNavigate: (page: Page) => void
  onSelectBot: (botId: string) => void
}

export default function DashboardHome({ isMobile, onNavigate, onSelectBot }: DashboardHomeProps) {
  const [bots, setBots] = useState<BotRow[]>([])
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null)
  const [botMetrics, setBotMetrics] = useState<Record<string, BotMetricSummary>>({})
  const [loading, setLoading] = useState(true)
  const [loadingBotMetrics, setLoadingBotMetrics] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      setLoading(true)
      setError(null)

      try {
        const [botRows, dashboardData] = await Promise.all([
          listBots(),
          getAnalyticsDashboard({ timeRange: 'month' }),
        ])

        if (!active) return
        setBots(botRows)
        setDashboard(dashboardData)
        setLoading(false)

        const visibleBots = botRows.slice(0, 6)
        if (visibleBots.length === 0) return

        setLoadingBotMetrics(true)
        const summaries = await Promise.all(
          visibleBots.map(async (bot) => {
            try {
              const botDashboard = await getAnalyticsDashboard({ timeRange: 'month', botId: bot.id })
              return [bot.id, toBotMetricSummary(botDashboard)] as const
            } catch {
              return [bot.id, null] as const
            }
          }),
        )

        if (!active) return
        setBotMetrics(Object.fromEntries(summaries.filter((item): item is readonly [string, BotMetricSummary] => Boolean(item[1]))))
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados reais do painel.')
        setDashboard(null)
        setBots([])
      } finally {
        if (active) {
          setLoading(false)
          setLoadingBotMetrics(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      active = false
    }
  }, [])

  const overview = dashboard?.overview ?? emptyOverview
  const today = new Date().toLocaleDateString('pt-BR')
  const visibleBots = bots.slice(0, 6)

  const kpis = useMemo<KpiCardData[]>(() => ([
    {
      label: 'Receita Total',
      value: formatCurrency(overview.revenueConfirmedCents),
      sub: `${formatCurrency(overview.revenueGeneratedCents)} gerados no mês`,
      pct: percent(overview.revenueConfirmedCents, overview.revenueGeneratedCents),
      accent: 'purple',
      loading,
    },
    {
      label: 'Pagos',
      value: formatNumber(overview.confirmedPayments),
      sub: `${formatNumber(overview.generatedPayments)} pagamentos gerados`,
      pct: overview.approvalRate,
      accent: 'green',
      loading,
    },
    {
      label: 'Interações',
      value: formatCompactNumber(overview.interactions),
      sub: `${formatCompactNumber(overview.starts)} starts registrados`,
      pct: overview.startRate,
      accent: 'pink',
      loading,
    },
    {
      label: 'Conversão',
      value: `${overview.leadSaleRate}%`,
      sub: 'leads que viraram venda',
      pct: overview.leadSaleRate,
      accent: 'gold',
      loading,
    },
  ]), [loading, overview])

  const quickActions: Array<{
    label: string
    color: string
    icon: typeof GitBranch
    onClick: () => void
  }> = [
    { label: 'Novo Fluxo', color: '#a855f7', icon: GitBranch, onClick: () => onNavigate('flowIntel') },
    { label: 'Adicionar Bot', color: '#39ff14', icon: BotIcon, onClick: () => onNavigate('bots') },
    { label: 'Ver Métricas', color: '#ff2a9d', icon: CreditCard, onClick: () => onNavigate('analytics') },
    { label: 'Ver Usuários', color: '#f59e0b', icon: Users, onClick: () => onNavigate('users') },
  ]

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ padding: isMobile ? '18px 14px' : '28px 32px' }}
    >
      <div
        className="mb-6 flex items-center gap-3 rounded-[16px] px-5 py-4"
        style={{
          background: 'linear-gradient(90deg,rgba(168,85,247,0.12),rgba(8,9,11,0.72))',
          border: '1px solid rgba(168,85,247,0.24)',
        }}
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: '#a855f7', boxShadow: '0 0 12px rgba(168,85,247,0.85)' }}
        />
        <span className="text-sm font-bold text-[#c084fc]">
          Painel real dos últimos 30 dias · vendas, interações e bots sincronizados
        </span>
        {!isMobile && (
          <span className="ml-auto shrink-0 font-mono text-[12px] text-slate-500">{today}</span>
        )}
      </div>

      <SectionTitle label="Métricas Principais" />
      <div
        className="mb-8 grid gap-4"
        style={{
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(4,minmax(0,1fr))',
        }}
      >
        {kpis.map((metric) => (
          <KpiCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <SectionTitle label={`Meus Bots (${bots.length})`} compact />
        <button
          type="button"
          onClick={() => onNavigate('bots')}
          className="rounded-[10px] border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-black text-[#c084fc]"
        >
          Ver todos
        </button>
      </div>

      {error && (
        <div
          className="mb-4 rounded-[14px] px-4 py-3 text-sm font-semibold"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#fca5a5',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div
          className="flex min-h-[180px] items-center justify-center rounded-[18px] text-sm font-bold text-slate-500"
          style={{ background: '#0c0d10', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Loader2 size={18} className="mr-3 animate-spin" aria-hidden />
          Carregando dados reais...
        </div>
      ) : bots.length === 0 ? (
        <div
          className="rounded-[18px] p-7 text-center text-base text-slate-400"
          style={{
            background: '#0c0d10',
            border: '1px dashed rgba(168,85,247,0.32)',
          }}
        >
          Nenhum bot cadastrado ainda.{' '}
          <button
            type="button"
            onClick={() => onNavigate('bots')}
            className="border-0 bg-transparent font-black"
            style={{ color: '#c084fc' }}
          >
            Criar o primeiro
          </button>
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,minmax(0,1fr))' }}
        >
          {visibleBots.map((bot) => (
            <BotCard
              key={bot.id}
              bot={bot}
              metrics={botMetrics[bot.id] ?? null}
              loadingMetrics={loadingBotMetrics && !botMetrics[bot.id]}
              onManage={() => {
                onSelectBot(bot.id)
                onNavigate('bots')
              }}
            />
          ))}
        </div>
      )}

      <div className="mt-8">
        <SectionTitle label="Ações Rápidas" />
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
          }}
        >
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="flex min-h-[86px] items-center gap-3 rounded-[16px] px-4 py-5 transition-all"
                style={{
                  background: '#0c0d10',
                  border: `1px solid ${action.color}35`,
                  color: action.color,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${action.color}70`
                  e.currentTarget.style.background = `${action.color}12`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = `${action.color}35`
                  e.currentTarget.style.background = '#0c0d10'
                }}
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]"
                  style={{
                    background: `${action.color}18`,
                    border: `1px solid ${action.color}35`,
                  }}
                >
                  <Icon size={19} aria-hidden color={action.color} />
                </div>
                <span className="text-left text-sm font-black leading-snug text-slate-100">
                  {action.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ label, compact }: { label: string; compact?: boolean }) {
  return (
    <div
      className={compact ? 'text-[12px] font-black uppercase' : 'mb-4 text-[12px] font-black uppercase'}
      style={{ letterSpacing: '0.16em', color: '#c084fc' }}
    >
      {label}
    </div>
  )
}
