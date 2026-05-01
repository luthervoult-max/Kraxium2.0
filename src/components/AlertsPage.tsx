import { useEffect, useState, type ElementType } from 'react'
import { AlertTriangle, Bell, RefreshCw, Wifi, Zap } from 'lucide-react'
import { getAlertsReport, type Alert, type AlertSeverity } from '@/lib/api/alerts'
import type { Page } from '@/lib/pages'

interface AlertsPageProps {
  onNavigate: (page: Page) => void
}

type Filter = 'all' | AlertSeverity

const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  critical: '#ff9d2a',
  high: '#ff2a9d',
  medium: '#b44dff',
}

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Médio',
}

const SEVERITY_ICON: Record<AlertSeverity, ElementType> = {
  critical: Wifi,
  high: AlertTriangle,
  medium: Zap,
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  return `há ${days}d`
}

function AlertSkeleton() {
  return (
    <div className="animate-pulse rounded-[14px] border border-white/10 bg-[#0c0d10] p-4">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 shrink-0 rounded-[9px] bg-white/5" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-12 rounded bg-white/5" />
            <div className="h-3 w-40 rounded bg-white/5" />
          </div>
          <div className="h-3 w-3/4 rounded bg-white/5" />
          <div className="h-2.5 w-20 rounded bg-white/5" />
        </div>
      </div>
    </div>
  )
}

export default function AlertsPage({ onNavigate }: AlertsPageProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceErrors, setSourceErrors] = useState<string[]>([])

  async function load(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true)
    try {
      const report = await getAlertsReport()
      setAlerts(report.alerts)
      setSourceErrors(report.errors)
      setError(null)
    } catch (err) {
      setAlerts([])
      setSourceErrors([])
      setError(err instanceof Error ? err.message : 'Falha ao carregar alertas.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = filter === 'all' ? alerts : alerts.filter((a) => a.severity === filter)

  const counts = {
    all: alerts.length,
    critical: alerts.filter((a) => a.severity === 'critical').length,
    high: alerts.filter((a) => a.severity === 'high').length,
    medium: alerts.filter((a) => a.severity === 'medium').length,
  }

  const filters: { key: Filter; label: string; color?: string }[] = [
    { key: 'all', label: `Todos` },
    { key: 'critical', label: `Crítico`, color: '#ff9d2a' },
    { key: 'high', label: `Alto`, color: '#ff2a9d' },
    { key: 'medium', label: `Médio`, color: '#b44dff' },
  ]

  return (
    <main className="space-y-7 p-4 lg:p-6">
      <div className="flex items-start justify-between">
        <div>
          <p
            className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: '#a78bfa' }}
          >
            Sistema
          </p>
          <h1 className="font-display text-2xl font-bold text-white">
            Alertas{' '}
            <span style={{ color: '#ff9d2a' }}>Importantes</span>
          </h1>
          {!loading && (
            <p className="mt-1 text-sm text-slate-500">
              {alerts.length === 0
                ? 'Nenhum alerta ativo no momento'
                : `${alerts.length} alerta${alerts.length !== 1 ? 's' : ''} ativo${alerts.length !== 1 ? 's' : ''} neste momento`}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing || loading}
          aria-label="Atualizar alertas"
          className="flex h-9 w-9 items-center justify-center rounded-[9px] text-slate-500 transition-colors hover:text-slate-300 disabled:opacity-40"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <RefreshCw size={15} aria-hidden className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {(error || sourceErrors.length > 0) && (
        <div
          className="rounded-[14px] px-4 py-3 text-sm leading-6"
          style={{
            background: 'rgba(255,157,42,0.1)',
            border: '1px solid rgba(255,157,42,0.28)',
            color: '#ffb15c',
          }}
        >
          {error
            ? `Não foi possível carregar os alertas: ${error}`
            : `Algumas fontes não responderam: ${sourceErrors.slice(0, 3).join(' | ')}`}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {filters.map(({ key, label, color }) => {
          const isActive = filter === key
          const count = counts[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all"
              style={{
                background: isActive
                  ? color
                    ? `${color}22`
                    : 'rgba(139,92,246,0.18)'
                  : 'rgba(255,255,255,0.04)',
                border: isActive
                  ? `1px solid ${color ?? 'rgba(139,92,246,0.5)'}`
                  : '1px solid rgba(255,255,255,0.07)',
                color: isActive ? (color ?? '#a78bfa') : '#64748b',
              }}
            >
              {label}
              <span
                className="flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
                style={{
                  background: isActive
                    ? color
                      ? `${color}33`
                      : 'rgba(139,92,246,0.25)'
                    : 'rgba(255,255,255,0.06)',
                  color: isActive ? (color ?? '#a78bfa') : '#475569',
                }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          <AlertSkeleton />
          <AlertSkeleton />
          <AlertSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: 'rgba(180,77,255,0.12)',
              border: '1px solid rgba(180,77,255,0.2)',
            }}
          >
            <Bell size={28} style={{ color: '#b44dff' }} aria-hidden />
          </div>
          <h3 className="text-lg font-bold text-white">Tudo em ordem!</h3>
          <p className="mt-1 text-sm text-slate-500">
            {filter === 'all'
              ? 'Nenhum alerta no momento. Continue assim!'
              : `Nenhum alerta de severidade "${SEVERITY_LABEL[filter as AlertSeverity]}" no momento.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const color = SEVERITY_COLOR[alert.severity]
            const Icon = SEVERITY_ICON[alert.severity]
            return (
              <div
                key={alert.id}
                className="overflow-hidden rounded-[14px] border border-white/10 bg-[#0c0d10]"
                style={{ borderLeft: `3px solid ${color}` }}
              >
                <div className="flex items-start gap-3 p-4">
                  <div
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]"
                    style={{ background: `${color}1a` }}
                  >
                    <Icon size={15} aria-hidden style={{ color }} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span
                        className="text-[10px] font-bold uppercase tracking-widest"
                        style={{ color }}
                      >
                        {SEVERITY_LABEL[alert.severity]}
                      </span>
                      <span className="text-slate-700">·</span>
                      <span className="text-sm font-semibold text-white">{alert.title}</span>
                    </div>
                    <p className="text-xs leading-5 text-slate-500">{alert.description}</p>
                    <p className="mt-1 text-[11px] text-slate-700">{relativeTime(alert.createdAt)}</p>
                  </div>

                  {alert.page && (
                    <button
                      type="button"
                      onClick={() => onNavigate(alert.page!)}
                      className="ml-2 shrink-0 whitespace-nowrap text-xs font-semibold transition-opacity hover:opacity-75"
                      style={{ color: '#b44dff' }}
                    >
                      Ver {alert.pageLabel} →
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
