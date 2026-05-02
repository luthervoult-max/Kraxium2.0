import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Ban,
  Bot,
  CalendarDays,
  Clock3,
  CreditCard,
  GitBranch,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Search,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  getLeadMetrics,
  getLeadTimeline,
  listLeadFilterOptions,
  listLeads,
  type LeadFilterOptions,
  type LeadFlowEvent,
  type LeadListItem,
  type LeadMetrics,
  type LeadStartsFilter,
  type LeadStatus,
  type LeadTimeRange,
} from '@/lib/api/users'

const pageSize = 35
const emptyMetrics: LeadMetrics = {
  novos: 0,
  pendentes: 0,
  pagos: 0,
  bloqueados: 0,
  total: 0,
}

const timeRanges: Array<{ id: LeadTimeRange; label: string }> = [
  { id: 'today', label: 'Hoje' },
  { id: 'yesterday', label: 'Ontem' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'all', label: 'Tudo' },
]

const statusOptions: Array<{ id: LeadStatus | 'all'; label: string }> = [
  { id: 'all', label: 'Todos os Status' },
  { id: 'novo', label: 'Novo' },
  { id: 'pendente', label: 'Pendente' },
  { id: 'pago', label: 'Pago' },
  { id: 'bloqueado', label: 'Bloqueado' },
]

const startOptions: Array<{ id: LeadStartsFilter; label: string }> = [
  { id: 'all', label: 'Todos Starts' },
  { id: 'one', label: '1 Start' },
  { id: 'twoPlus', label: '2+ Starts' },
  { id: 'fivePlus', label: '5+ Starts' },
  { id: 'tenPlus', label: '10+ Starts' },
]

export default function UsersPage() {
  const [leads, setLeads] = useState<LeadListItem[]>([])
  const [metrics, setMetrics] = useState<LeadMetrics>(emptyMetrics)
  const [options, setOptions] = useState<LeadFilterOptions>({ bots: [], flows: [] })
  const [search, setSearch] = useState('')
  const [timeRange, setTimeRange] = useState<LeadTimeRange>('all')
  const [botId, setBotId] = useState('all')
  const [flowId, setFlowId] = useState('all')
  const [status, setStatus] = useState<LeadStatus | 'all'>('all')
  const [starts, setStarts] = useState<LeadStartsFilter>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<LeadListItem | null>(null)
  const [timeline, setTimeline] = useState<LeadFlowEvent[]>([])
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    setOptionsLoading(true)
    listLeadFilterOptions()
      .then((data) => {
        if (!cancelled) setOptions(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar filtros.')
        }
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setError(null)

    const filters = { search, timeRange, botId, flowId, status, starts, page, pageSize }

    Promise.all([listLeads(filters), getLeadMetrics(filters)])
      .then(([leadData, metricData]) => {
        if (cancelled) return
        setLeads(leadData.leads)
        setTotal(leadData.total)
        setMetrics(metricData)
      })
      .catch((err) => {
        if (cancelled) return
        setLeads([])
        setTotal(0)
        setMetrics(emptyMetrics)
        setError(err instanceof Error ? err.message : 'Falha ao carregar leads.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [botId, flowId, page, search, starts, status, timeRange])

  const filteredFlows = useMemo(() => {
    if (botId === 'all') return options.flows
    return options.flows.filter((flow) => flow.bot_id === botId)
  }, [botId, options.flows])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const lastRow = Math.min(page * pageSize, total)

  function resetToFirstPage() {
    setPage(1)
  }

  function handleBotChange(nextBotId: string) {
    setBotId(nextBotId)
    setFlowId('all')
    resetToFirstPage()
  }

  async function openLeadDrawer(lead: LeadListItem) {
    setSelectedLead(lead)
    setTimeline([])
    setDrawerError(null)
    setDrawerLoading(true)
    try {
      const events = await getLeadTimeline(lead.id)
      setTimeline(events)
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Falha ao carregar timeline.')
    } finally {
      setDrawerLoading(false)
    }
  }

  return (
    <main className="space-y-6 p-6">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-white">Base de Clientes</h2>
          <p className="mt-2 text-sm text-gray-400">
            Veja quem deu start no bot e onde cada lead parou dentro do fluxo.
          </p>
        </div>

        <TimeRangeTabs value={timeRange} onChange={(next) => {
          setTimeRange(next)
          resetToFirstPage()
        }} />
      </section>

      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-fit rounded-[14px] border border-white/10 bg-[#0d0f16] p-1">
          <button
            type="button"
            className="flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white shadow-[inset_0_0_18px_rgba(255,255,255,0.03)]"
          >
            <Users size={16} aria-hidden="true" />
            Todos os Leads
          </button>
          <button
            type="button"
            disabled
            className="flex cursor-not-allowed items-center gap-2 rounded-[10px] px-4 py-3 text-sm font-bold text-gray-600"
            title="Controle de Acessos em breve"
          >
            <UserRound size={16} aria-hidden="true" />
            Controle de Acessos
          </button>
        </div>

        {error && (
          <div className="max-w-2xl rounded-2xl border border-neon-orange/30 bg-neon-orange/10 px-4 py-3 text-xs leading-5 text-neon-orange">
            {isSchemaMissing(error)
              ? 'As tabelas de leads ainda nao existem no Supabase. Aplique a migration em supabase/migrations/20260429000100_create_telegram_leads.sql.'
              : error}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <UsersMetricCard icon={UserRound} label="Novos" value={metrics.novos} tone="green" />
        <UsersMetricCard icon={Clock3} label="Pendentes" value={metrics.pendentes} tone="orange" />
        <UsersMetricCard icon={RefreshCcw} label="Pagos" value={metrics.pagos} tone="purple" />
        <UsersMetricCard icon={Ban} label="Bloqueados" value={metrics.bloqueados} tone="red" />
        <UsersMetricCard icon={Users} label="Total Leads" value={metrics.total} tone="gray" />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(320px,1fr)_200px_220px_220px_200px]">
        <label className="relative block">
          <Search
            size={20}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"
            aria-hidden="true"
          />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              resetToFirstPage()
            }}
            placeholder="Buscar por nome, telefone, email..."
            className="h-[54px] w-full rounded-[14px] border border-white/10 bg-surface-2 pl-12 pr-4 text-sm font-semibold text-white outline-none transition-colors placeholder:text-gray-600 focus:border-neon-purple/45"
          />
        </label>

        <FilterSelect
          icon={Bot}
          value={botId}
          onChange={handleBotChange}
          disabled={optionsLoading}
          options={[
            { value: 'all', label: 'Todos os Bots' },
            ...options.bots.map((bot) => ({ value: bot.id, label: bot.name })),
          ]}
        />

        <FilterSelect
          icon={GitBranch}
          value={flowId}
          onChange={(value) => {
            setFlowId(value)
            resetToFirstPage()
          }}
          disabled={optionsLoading}
          options={[
            { value: 'all', label: 'Todos os Fluxos' },
            ...filteredFlows.map((flow) => ({ value: flow.id, label: flow.name })),
          ]}
        />

        <FilterSelect
          icon={UserRound}
          value={status}
          onChange={(value) => {
            setStatus(value as LeadStatus | 'all')
            resetToFirstPage()
          }}
          options={statusOptions.map((item) => ({ value: item.id, label: item.label }))}
        />

        <FilterSelect
          icon={RefreshCcw}
          value={starts}
          onChange={(value) => {
            setStarts(value as LeadStartsFilter)
            resetToFirstPage()
          }}
          options={startOptions.map((item) => ({ value: item.id, label: item.label }))}
        />
      </section>

      <section className="overflow-hidden rounded-[18px] border border-white/10 bg-surface-2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.025] text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">
                <th className="px-4 py-4">Nome / Email</th>
                <th className="px-3 py-4">ID</th>
                <th className="px-3 py-4">Cod. Vendas</th>
                <th className="px-3 py-4">Plano</th>
                <th className="px-3 py-4">Bot</th>
                <th className="px-3 py-4">Fluxo</th>
                <th className="px-3 py-4">Etapa atual</th>
                <th className="px-3 py-4">Status</th>
                <th className="px-3 py-4">Data</th>
                <th className="px-4 py-4 text-right">Chat</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} className="px-7 py-16 text-center text-sm text-gray-500">
                    <Loader2 size={18} className="mx-auto mb-3 animate-spin" aria-hidden="true" />
                    Carregando leads...
                  </td>
                </tr>
              )}

              {!loading && leads.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-7 py-16 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-neon-purple/20 bg-neon-purple/10 text-neon-purple">
                      <Users size={22} aria-hidden="true" />
                    </div>
                    <h2 className="mt-4 text-lg font-bold text-white">Nenhum lead encontrado</h2>
                    <p className="mt-2 text-sm text-gray-500">
                      Quando o backend do bot registrar /start, os leads aparecem aqui.
                    </p>
                  </td>
                </tr>
              )}

              {!loading && leads.map((lead) => (
                <LeadRow key={lead.id} lead={lead} onOpen={() => void openLeadDrawer(lead)} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 px-7 py-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Mostrando <strong className="text-white">{firstRow}-{lastRow}</strong> de{' '}
            <strong className="text-white">{total}</strong> clientes
          </span>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="h-9 rounded-lg border-white/10 bg-white/5 text-xs text-gray-300 hover:bg-white/10 disabled:opacity-40"
            >
              Anterior
            </Button>
            <span className="min-w-10 text-center text-xs text-gray-400">
              {page} / {totalPages}
            </span>
            <Button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="h-9 rounded-lg bg-neon-purple/80 px-4 text-xs font-bold text-deep-900 hover:bg-neon-purple disabled:opacity-40"
            >
              Proxima
            </Button>
          </div>
        </div>
      </section>

      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          timeline={timeline}
          loading={drawerLoading}
          error={drawerError}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </main>
  )
}

function TimeRangeTabs({
  value,
  onChange,
}: {
  value: LeadTimeRange
  onChange: (value: LeadTimeRange) => void
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
              isActive
                ? 'bg-white/10 text-white shadow-[inset_0_0_18px_rgba(255,255,255,0.04)]'
                : 'text-gray-500 hover:text-gray-200',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

function UsersMetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: number
  tone: 'green' | 'orange' | 'purple' | 'red' | 'gray'
}) {
  const toneClass = {
    green: 'border-neon-green/20 bg-neon-green/10 text-neon-green',
    orange: 'border-neon-orange/20 bg-neon-orange/10 text-neon-orange',
    purple: 'border-neon-purple/20 bg-neon-purple/10 text-neon-purple',
    red: 'border-red-500/20 bg-red-500/10 text-red-400',
    gray: 'border-white/10 bg-white/5 text-gray-400',
  }[tone]

  return (
    <div className="rounded-[14px] border border-white/10 bg-surface-2 px-6 py-7">
      <div className="flex items-center gap-5">
        <span className={cn('flex h-14 w-14 items-center justify-center rounded-2xl border', toneClass)}>
          <Icon size={24} aria-hidden="true" />
        </span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-white">{value}</p>
        </div>
      </div>
    </div>
  )
}

function FilterSelect({
  icon: Icon,
  value,
  options,
  onChange,
  disabled,
}: {
  icon: LucideIcon
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
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-[54px] w-full appearance-none rounded-[14px] border border-white/10 bg-surface-2 pl-11 pr-9 text-sm font-bold text-gray-300 outline-none transition-colors focus:border-neon-purple/45 disabled:opacity-50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-surface-2 text-gray-200">
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-600">v</span>
    </label>
  )
}

function LeadRow({ lead, onOpen }: { lead: LeadListItem; onOpen: () => void }) {
  const name = getLeadName(lead)
  const contact = getLeadContact(lead)

  return (
    <tr className="border-b border-white/10 text-sm text-gray-400 last:border-b-0 hover:bg-white/[0.025]">
      <td className="px-4 py-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm font-black text-gray-300">
            {getInitials(name)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="max-w-[190px] truncate text-base font-black text-white">{name}</p>
              {lead.status === 'bloqueado' && (
                <Badge className="border-neon-orange/30 bg-neon-orange/20 px-2 py-1 text-[9px] uppercase leading-none text-neon-orange">
                  Lead bloqueou
                </Badge>
              )}
              {lead.start_count > 1 && (
                <Badge className="border-neon-orange/30 bg-neon-orange/15 px-2 py-1 text-[9px] uppercase leading-none text-neon-orange">
                  {lead.start_count}x
                </Badge>
              )}
            </div>
            <p className="mt-1 truncate text-xs text-gray-500">{contact}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-4 font-mono text-gray-500">#{lead.telegram_user_id.slice(-5)}</td>
      <td className="px-3 py-4 font-mono text-neon-orange">{lead.sales_code || '-'}</td>
      <td className="px-3 py-4">{lead.plan_name || '-'}</td>
      <td className="px-3 py-4">
        <span className="inline-flex items-center gap-2">
          <Bot size={14} className="text-gray-600" aria-hidden="true" />
          {lead.bot?.name ?? '-'}
        </span>
      </td>
      <td className="px-3 py-4">
        <span className="inline-flex items-center gap-2">
          <GitBranch size={14} className="text-gray-600" aria-hidden="true" />
          {lead.flow?.name ?? '-'}
        </span>
      </td>
      <td className="px-3 py-4">
        <span className="max-w-[160px] truncate text-gray-300">
          {lead.last_node_label || 'Start'}
        </span>
      </td>
      <td className="px-3 py-4">
        <StatusBadge status={lead.status as LeadStatus} />
      </td>
      <td className="px-3 py-4 whitespace-pre-line font-mono text-xs text-gray-500">
        {formatDateTime(lead.last_seen_at)}
      </td>
      <td className="px-4 py-4 text-right">
        <Button
          type="button"
          variant="outline"
          onClick={onOpen}
          className="h-12 rounded-[10px] border-white/10 bg-white/5 px-4 text-xs font-black text-gray-300 hover:border-neon-purple/30 hover:bg-neon-purple/10 hover:text-white"
        >
          <MessageSquare size={13} className="mr-2" aria-hidden="true" />
          Abrir Chat
        </Button>
      </td>
    </tr>
  )
}

function LeadDrawer({
  lead,
  timeline,
  loading,
  error,
  onClose,
}: {
  lead: LeadListItem
  timeline: LeadFlowEvent[]
  loading: boolean
  error: string | null
  onClose: () => void
}) {
  const visitedNodes = new Set(timeline.map((event) => event.node_id).filter(Boolean)).size
  const totalNodes = getMetadataNumber(lead.metadata, 'flow_total_nodes')
  const progress = totalNodes ? Math.min(100, Math.round((visitedNodes / totalNodes) * 100)) : null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fechar detalhes" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-[#0b0c10] shadow-[0_0_80px_rgba(0,0,0,0.7)]">
        <header className="border-b border-white/10 p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neon-purple">Timeline do lead</p>
              <h2 className="mt-2 truncate text-2xl font-black text-white">{getLeadName(lead)}</h2>
              <p className="mt-1 text-sm text-gray-500">{getLeadContact(lead)}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:text-white"
              aria-label="Fechar"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DrawerStat label="Bot" value={lead.bot?.name ?? '-'} />
            <DrawerStat label="Fluxo" value={lead.flow?.name ?? '-'} />
            <DrawerStat label="Starts" value={`${lead.start_count}`} />
            <DrawerStat label="Ultimo no" value={lead.last_node_label || 'Start'} />
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-bold text-gray-400">Progresso do fluxo</span>
              <span className="font-mono text-neon-purple">
                {progress === null ? `${visitedNodes} nos visitados` : `${progress}%`}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-neon-purple via-neon-magenta to-neon-purple"
                style={{ width: `${progress ?? Math.min(100, visitedNodes * 12)}%` }}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-gray-500">
              {lead.last_node_label
                ? `Este lead parou em "${lead.last_node_label}".`
                : 'Este lead ainda nao avancou depois do start.'}
            </p>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-14 text-gray-500">
              <Loader2 size={18} className="mr-3 animate-spin" aria-hidden="true" />
              Carregando eventos...
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {!loading && !error && timeline.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-gray-500">
              Nenhum evento registrado para este lead ainda.
            </div>
          )}

          {!loading && !error && timeline.length > 0 && (
            <ol className="relative space-y-4">
              {timeline.map((event) => (
                <TimelineEvent key={event.id} event={event} />
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  )
}

function DrawerStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-600">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-white">{value}</p>
    </div>
  )
}

function TimelineEvent({ event }: { event: LeadFlowEvent }) {
  const { label, icon: Icon, className } = getEventTone(event)

  return (
    <li className="flex gap-4">
      <span className={cn('mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', className)}>
        <Icon size={17} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-bold text-white">{label}</h3>
          <span className="font-mono text-[11px] text-gray-600">{formatDateTime(event.occurred_at)}</span>
        </div>
        <p className="mt-2 text-sm leading-6 text-gray-400">{getEventDescription(event)}</p>
        {event.node_label && (
          <Badge className="mt-3 border-neon-purple/20 bg-neon-purple/10 text-neon-purple">
            {event.node_type ? `${event.node_type} - ${event.node_label}` : event.node_label}
          </Badge>
        )}
      </div>
    </li>
  )
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const classes: Record<LeadStatus, string> = {
    novo: 'border-neon-green/25 bg-neon-green/10 text-neon-green',
    pendente: 'border-neon-orange/25 bg-neon-orange/10 text-neon-orange',
    pago: 'border-neon-purple/25 bg-neon-purple/10 text-neon-purple',
    bloqueado: 'border-red-500/25 bg-red-500/10 text-red-300',
  }

  return (
    <Badge className={cn('px-3 py-1 text-[11px] font-black uppercase', classes[status] ?? classes.novo)}>
      {status}
    </Badge>
  )
}

function getEventTone(event: LeadFlowEvent): {
  label: string
  icon: LucideIcon
  className: string
} {
  if (event.event_type === 'start') {
    return { label: 'Start no bot', icon: UserRound, className: 'border-neon-green/25 bg-neon-green/10 text-neon-green' }
  }
  if (event.event_type === 'payment') {
    return { label: 'Pagamento confirmado', icon: CreditCard, className: 'border-neon-purple/25 bg-neon-purple/10 text-neon-purple' }
  }
  if (event.event_type === 'blocked') {
    return { label: 'Lead bloqueado', icon: Ban, className: 'border-red-500/25 bg-red-500/10 text-red-300' }
  }
  if (event.event_type === 'node_error') {
    return { label: 'Erro no no', icon: AlertTriangle, className: 'border-red-500/25 bg-red-500/10 text-red-300' }
  }
  return { label: 'Avancou no fluxo', icon: GitBranch, className: 'border-neon-purple/25 bg-neon-purple/10 text-neon-purple' }
}

function getEventDescription(event: LeadFlowEvent) {
  if (event.message) return event.message
  if (event.event_type === 'start') return 'O lead iniciou uma conversa com /start.'
  if (event.event_type === 'node_enter') return 'O lead entrou nesta etapa do fluxo.'
  if (event.event_type === 'node_success') return 'O no foi executado com sucesso.'
  if (event.event_type === 'node_error') return 'A execucao do no falhou. Veja metadata no storage para detalhes tecnicos.'
  if (event.event_type === 'payment') return 'O lead realizou pagamento ou foi marcado como convertido.'
  if (event.event_type === 'blocked') return 'O lead bloqueou o bot ou saiu do atendimento.'
  if (event.event_type === 'handoff') return 'O lead foi encaminhado para atendimento manual.'
  return 'Evento registrado no fluxo.'
}

function getLeadName(lead: LeadListItem) {
  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim()
  return lead.display_name || fullName || lead.username || `Lead ${lead.telegram_user_id}`
}

function getLeadContact(lead: LeadListItem) {
  if (lead.email) return lead.email
  if (lead.phone) return lead.phone
  if (lead.username) return `@${lead.username}`
  return `ID: ${lead.telegram_user_id}`
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'L'
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
  return formatted.replace(', ', '\n')
}

function getMetadataNumber(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const value = (metadata as Record<string, unknown>)[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function isSchemaMissing(message: string) {
  return /telegram_leads|lead_flow_events|schema cache|relation .* does not exist/i.test(message)
}
