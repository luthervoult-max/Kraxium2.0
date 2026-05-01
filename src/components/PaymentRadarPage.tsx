import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Filter,
  GitBranch,
  Globe2,
  Loader2,
  RefreshCcw,
  Smartphone,
  Webhook,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  getPaymentRadarDashboard,
  PAYMENT_RADAR_GATEWAYS,
  type PaymentRadarDashboard,
  type PaymentRadarGateway,
  type PaymentRadarHealth,
  type PaymentRadarPeriod,
  type PaymentRadarProvider,
  type PaymentRadarStatusFilter,
} from '@/lib/api/paymentRadar'

const periodOptions: Array<{ id: PaymentRadarPeriod; label: string }> = [
  { id: '24h', label: '24h' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
]

const providerOptions: Array<{ id: PaymentRadarProvider; label: string }> = [
  { id: 'all', label: 'Todos os gateways' },
  ...PAYMENT_RADAR_GATEWAYS.map((gateway) => ({ id: gateway.id, label: gateway.name })),
]

const statusOptions: Array<{ id: PaymentRadarStatusFilter; label: string }> = [
  { id: 'all', label: 'Todos os status' },
  { id: 'paid', label: 'Pago' },
  { id: 'pending', label: 'Pendente' },
  { id: 'failed', label: 'Falhou/expirou' },
]

export default function PaymentRadarPage() {
  const [period, setPeriod] = useState<PaymentRadarPeriod>('24h')
  const [provider, setProvider] = useState<PaymentRadarProvider>('all')
  const [botId, setBotId] = useState('all')
  const [flowId, setFlowId] = useState('all')
  const [status, setStatus] = useState<PaymentRadarStatusFilter>('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [dashboard, setDashboard] = useState<PaymentRadarDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedPath, setCopiedPath] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getPaymentRadarDashboard({ period, provider, botId, flowId, status })
      .then((data) => {
        if (!cancelled) setDashboard(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setDashboard(null)
          setError(err instanceof Error ? err.message : 'Falha ao carregar Radar de Pagamentos.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [botId, flowId, period, provider, refreshKey, status])

  const filteredFlows = useMemo(() => {
    const flows = dashboard?.options.flows ?? []
    if (botId === 'all') return flows
    return flows.filter((flow) => flow.bot_id === botId)
  }, [botId, dashboard?.options.flows])

  function clearFilters() {
    setProvider('all')
    setBotId('all')
    setFlowId('all')
    setStatus('all')
  }

  function handleBotChange(nextBotId: string) {
    setBotId(nextBotId)
    setFlowId('all')
  }

  async function copyWebhook(path: string) {
    const url = buildWebhookUrl(path)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedPath(path)
      window.setTimeout(() => setCopiedPath(null), 1800)
    } catch {
      setCopiedPath(null)
    }
  }

  const hasTransactions = Boolean(dashboard && dashboard.overview.gatewayLeads > 0)

  return (
    <main className="space-y-6 p-6">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-neon-purple">
            Integrações
          </p>
          <h2 className="mt-2 text-4xl font-black tracking-tight text-white">
            Radar de Pagamentos
          </h2>
          <p className="mt-2 max-w-3xl border-l border-white/10 pl-4 text-base leading-6 text-gray-500">
            Saude dos seus gateways, conversao PIX e pontos de perda do fluxo.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="rounded-full border border-white/10 bg-[#0c0d10] px-4 py-2 text-xs font-bold text-gray-500">
            {dashboard ? formatUpdatedAt(dashboard.updatedAt) : 'Aguardando dados'}
          </span>
          <Button
            type="button"
            onClick={() => setRefreshKey((current) => current + 1)}
            disabled={loading}
            className="h-11 rounded-full border border-neon-purple/40 bg-neon-purple/15 px-5 font-black text-neon-purple hover:bg-neon-purple/20"
          >
            {loading ? (
              <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCcw size={16} className="mr-2" aria-hidden="true" />
            )}
            Atualizar
          </Button>
        </div>
      </section>

      <section className="rounded-[18px] border border-neon-purple/20 bg-[radial-gradient(circle_at_15%_15%,rgba(180,77,255,0.16),transparent_34%),#0c0d10] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] border border-neon-purple/30 bg-neon-purple/10 text-neon-purple shadow-[0_0_24px_rgba(180,77,255,0.16)]">
              <Globe2 size={30} aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
                  Status global PIX
                </p>
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
                  fonte externa
                </span>
              </div>
              <h3 className="mt-2 text-2xl font-black text-white">
                Verificar instabilidade nacional no Downdetector
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
                Use como apoio quando seus gateways mostram quedas ao mesmo tempo. O radar abaixo
                continua usando apenas dados privados da sua conta.
              </p>
            </div>
          </div>

          <a
            href="https://downdetector.com.br/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-neon-purple/35 bg-neon-purple/15 px-6 text-sm font-black text-neon-purple transition-colors hover:bg-neon-purple/25"
          >
            Abrir
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className="rounded-[18px] border border-white/10 bg-[#0c0d10] p-4">
        <div className="mb-4 flex items-center gap-3 text-sm font-black text-white">
          <Filter size={16} className="text-neon-purple" aria-hidden="true" />
          Filtros do Radar
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <FilterSelect
            label="Periodo"
            value={period}
            onChange={(value) => setPeriod(value as PaymentRadarPeriod)}
            options={periodOptions}
          />
          <FilterSelect
            label="Gateway"
            value={provider}
            onChange={(value) => setProvider(value as PaymentRadarProvider)}
            options={providerOptions}
          />
          <FilterSelect
            label="Bot"
            value={botId}
            onChange={handleBotChange}
            options={[
              { id: 'all', label: 'Todos os bots' },
              ...(dashboard?.options.bots ?? []).map((bot) => ({ id: bot.id, label: bot.name })),
            ]}
          />
          <FilterSelect
            label="Fluxo"
            value={flowId}
            onChange={setFlowId}
            options={[
              { id: 'all', label: 'Todos os fluxos' },
              ...filteredFlows.map((flow) => ({ id: flow.id, label: flow.name || 'Fluxo sem nome' })),
            ]}
          />
          <FilterSelect
            label="Status"
            value={status}
            onChange={(value) => setStatus(value as PaymentRadarStatusFilter)}
            options={statusOptions}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-gray-500 transition-colors hover:border-neon-purple/30 hover:text-white"
          >
            Limpar filtros
          </button>
        </div>
      </section>

      {error && !dashboard && (
        <div className="rounded-[18px] border border-neon-orange/30 bg-neon-orange/10 px-5 py-4 text-sm font-bold leading-6 text-neon-orange">
          {error}
        </div>
      )}

      {loading && !dashboard ? (
        <LoadingBlock />
      ) : dashboard ? (
        <>
          <ConsoleChannelGrid dashboard={dashboard} />

          {dashboard.diagnostics.length > 0 && (
            <section className="rounded-[18px] border border-neon-orange/30 bg-neon-orange/10 px-5 py-4">
              {dashboard.diagnostics.map((diagnostic) => (
                <div key={diagnostic.code} className="flex gap-3 text-sm leading-6 text-neon-orange">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-black text-white">{diagnostic.title}</p>
                    <p className="mt-1 font-bold text-neon-orange">{diagnostic.message}</p>
                  </div>
                </div>
              ))}
            </section>
          )}

          {!hasTransactions && (
            <section className="flex min-h-[230px] flex-col items-center justify-center rounded-[18px] border border-dashed border-white/12 bg-[#08090b] px-6 text-center">
              <Zap size={44} className="text-gray-500" aria-hidden="true" />
              <h3 className="mt-5 text-2xl font-black text-white">
                Nenhuma transacao nas {dashboard.rangeLabel}
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
                Quando seus bots gerarem PIX, os leads que chegaram ao gateway, pagamentos pagos e
                falhas aparecem aqui sem dado inventado.
              </p>
            </section>
          )}

          <section id="radar-gateway-ranking" className="grid scroll-mt-6 grid-cols-1 gap-4 xl:grid-cols-4">
            {dashboard.gateways.map((gateway) => (
              <GatewayRadarCard key={gateway.id} gateway={gateway} />
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <FunnelPanel dashboard={dashboard} />
            <WebhookPanel
              gateways={dashboard.gateways}
              copiedPath={copiedPath}
              onCopy={(path) => void copyWebhook(path)}
            />
          </section>
        </>
      ) : null}
    </main>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ id: string; label: string }>
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-gray-600">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-[12px] border border-white/10 bg-[#08090b] px-3 text-sm font-bold text-white outline-none transition-colors focus:border-neon-purple/55"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id} className="bg-[#08090b] text-white">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function ConsoleChannelGrid({ dashboard }: { dashboard: PaymentRadarDashboard }) {
  const connectedGateways = dashboard.gateways.filter((gateway) => gateway.connected).length
  const webhookGateways = dashboard.gateways.filter((gateway) => gateway.webhookPath)
  const activeWebhooks = webhookGateways.filter((gateway) => gateway.lastEventAt).length
  const totalGateways = dashboard.gateways.length
  const gatewaySignal = dashboard.gateways.map((gateway) => gateway.transactions + gateway.paid + (gateway.connected ? 1 : 0))
  const webhookSignal = webhookGateways.map((gateway) => gateway.transactions + (gateway.lastEventAt ? 1 : 0))
  const conversionSignal = [
    dashboard.funnel.startToGatewayRate,
    dashboard.funnel.gatewayToPaidRate,
    dashboard.funnel.startToPaidRate,
    dashboard.overview.conversionRate,
  ]
  const failureSignal = dashboard.gateways.map((gateway) => gateway.failedOrExpired + gateway.failureRate)

  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <ConsoleChannelCard
        channel="CH.01"
        title="GATEWAYS"
        status={connectedGateways > 0 ? 'OPERACIONAL' : 'INATIVO'}
        value={padMetric(connectedGateways)}
        unit="conectados"
        subtitle={`${connectedGateways}/${totalGateways} gateways prontos`}
        signal={gatewaySignal}
        footerCode="TX-GW24"
        actionLabel="+ VER DETALHES"
        onAction={() => scrollToSection('radar-gateway-ranking')}
      />
      <ConsoleChannelCard
        channel="CH.02"
        title="WEBHOOKS"
        status={activeWebhooks > 0 ? 'OPERACIONAL' : 'INATIVO'}
        value={padMetric(activeWebhooks)}
        unit="endpoints"
        subtitle={`${webhookGateways.length} URLs configuraveis`}
        signal={webhookSignal}
        footerCode="TX-WB12"
        actionLabel="+ GERENCIAR WEBHOOKS"
        onAction={() => scrollToSection('radar-webhooks')}
      />
      <ConsoleChannelCard
        channel="CH.03"
        title="CONVERSAO"
        status={dashboard.overview.gatewayLeads > 0 ? 'OPERACIONAL' : 'INATIVO'}
        value={`${dashboard.overview.conversionRate.toFixed(1)}%`}
        unit="pago / gerado"
        subtitle={`${formatNumber(dashboard.overview.paid)} pagos de ${formatNumber(dashboard.overview.gatewayLeads)}`}
        signal={conversionSignal}
        footerCode="TX-CV03"
        actionLabel="+ VER FUNIL"
        onAction={() => scrollToSection('radar-funnel')}
      />
      <ConsoleChannelCard
        channel="CH.04"
        title="FALHAS"
        status={dashboard.overview.failedOrExpired > 0 ? 'INSTAVEL' : 'OPERACIONAL'}
        value={padMetric(dashboard.overview.failedOrExpired)}
        unit="falhas"
        subtitle={`${formatNumber(dashboard.overview.pending)} pendentes em ${dashboard.rangeLabel}`}
        signal={failureSignal}
        footerCode="TX-ER04"
        actionLabel="+ VER GATEWAYS"
        onAction={() => scrollToSection('radar-gateway-ranking')}
      />
    </section>
  )
}

function ConsoleChannelCard({
  channel,
  title,
  status,
  value,
  unit,
  subtitle,
  signal,
  footerCode,
  actionLabel,
  onAction,
}: {
  channel: string
  title: string
  status: 'OPERACIONAL' | 'INATIVO' | 'INSTAVEL'
  value: string
  unit: string
  subtitle: string
  signal: number[]
  footerCode: string
  actionLabel: string
  onAction: () => void
}) {
  const statusClass =
    status === 'OPERACIONAL'
      ? 'bg-neon-green'
      : status === 'INSTAVEL'
        ? 'bg-neon-orange'
        : 'bg-gray-600'

  return (
    <article className="group overflow-hidden rounded-none border border-white/10 bg-[#08090b] shadow-[0_22px_70px_rgba(0,0,0,0.24)] transition-colors hover:border-neon-purple/35">
      <div className="flex min-h-[330px] flex-col p-5">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 font-mono text-[11px] uppercase tracking-[0.18em]">
          <span className="text-gray-500">{channel}</span>
          <span className="text-white">{title}</span>
        </div>

        <div className="mt-5 flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.18em] text-gray-500">
          <span className={cn('h-2.5 w-2.5 rounded-full', statusClass)} />
          {status}
        </div>

        <div className="mt-6 font-mono text-[56px] font-black leading-none text-white sm:text-[64px]">
          {value}
        </div>
        <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.16em] text-gray-500">{unit}</p>

        <div className="mt-5">
          <SparkLine values={signal} />
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 text-sm">
          <span className="min-w-0 truncate font-bold text-white">{subtitle}</span>
          <span className="shrink-0 font-mono text-xs text-gray-500">{status === 'INATIVO' ? 'sem entradas' : 'ao vivo'}</span>
        </div>

        <button
          type="button"
          onClick={onAction}
          className="mt-auto flex h-11 w-full items-center justify-center rounded-[6px] border border-neon-purple/35 bg-neon-purple/5 font-mono text-[12px] font-black uppercase tracking-[0.16em] text-neon-purple transition-colors hover:bg-neon-purple/15"
        >
          {actionLabel}
        </button>
      </div>

      <div className="border-t border-white/[0.08] px-5 py-4 font-mono text-[11px] uppercase tracking-[0.18em] text-gray-600">
        {footerCode}
      </div>
    </article>
  )
}

function SparkLine({ values }: { values: number[] }) {
  const normalized = normalizeSparkValues(values)
  const points = normalized
    .map((value, index) => {
      const x = normalized.length === 1 ? 0 : (index / (normalized.length - 1)) * 100
      const y = 44 - value * 34
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg viewBox="0 0 100 48" role="img" aria-label="Linha de atividade" className="h-16 w-full">
      <defs>
        <linearGradient id="radar-spark" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#b44dff" />
          <stop offset="100%" stopColor="#39ff14" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke="url(#radar-spark)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.6"
      />
    </svg>
  )
}

function normalizeSparkValues(values: number[]) {
  const clean = values.map((value) => (Number.isFinite(value) ? Math.max(0, value) : 0))
  const source = clean.length > 1 ? clean : [0, clean[0] ?? 0, 0]
  const max = Math.max(...source, 1)
  const normalized = source.map((value) => value / max)

  if (normalized.every((value) => value === 0)) {
    return [0.35, 0.35, 0.35, 0.35, 0.35]
  }

  return normalized
}

function padMetric(value: number) {
  return value < 10 ? `0${value}` : formatNumber(value)
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function GatewayRadarCard({ gateway }: { gateway: PaymentRadarGateway }) {
  const health = getHealthMeta(gateway.health)
  const methodIcon = gateway.method === 'pix' ? Smartphone : CreditCard
  const MethodIcon = methodIcon

  return (
    <article className="rounded-[18px] border border-white/10 bg-[#0c0d10] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-neon-purple/30 bg-neon-purple/10 text-neon-purple">
            <MethodIcon size={21} aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-lg font-black text-white">{gateway.name}</h3>
            <p className="mt-1 text-xs leading-5 text-gray-500">{gateway.description}</p>
          </div>
        </div>
        <span className={cn('rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]', health.badge)}>
          {health.label}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <MiniStat label="Gerados" value={formatNumber(gateway.transactions)} />
        <MiniStat label="Pagos" value={formatNumber(gateway.paid)} />
        <MiniStat label="Falhas" value={formatNumber(gateway.failedOrExpired)} />
        <MiniStat label="Conversao" value={`${gateway.conversionRate}%`} />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-gray-500">
          <span>Saude do gateway</span>
          <span>{gateway.failureRate}% falhas</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className={cn('h-full rounded-full', health.bar)}
            style={{ width: `${Math.max(4, Math.min(100, 100 - gateway.failureRate))}%` }}
          />
        </div>
      </div>

      <div className="mt-5 rounded-[14px] border border-white/10 bg-[#08090b] p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-600">
            Receita
          </span>
          <span className="text-sm font-black text-neon-green">
            {formatCurrency(gateway.revenueConfirmedCents)}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-500">
          <span>Ultimo evento</span>
          <span className="font-bold text-gray-400">{formatDateTime(gateway.lastEventAt)}</span>
        </div>
      </div>
    </article>
  )
}

function FunnelPanel({ dashboard }: { dashboard: PaymentRadarDashboard }) {
  const { funnel } = dashboard

  return (
    <section id="radar-funnel" className="scroll-mt-6 rounded-[18px] border border-white/10 bg-[#0c0d10] p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-white">Funil de Perda</h3>
          <p className="mt-1 text-sm text-gray-500">Onde o lead para antes ou dentro do gateway.</p>
        </div>
        <GitBranch size={22} className="text-neon-purple" aria-hidden="true" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <FunnelStep
          icon={Bot}
          label="Starts do fluxo"
          value={funnel.starts}
          rate={100}
          detail="entrada"
        />
        <FunnelStep
          icon={ArrowRight}
          label="Chegou no pagamento"
          value={funnel.reachedGateway}
          rate={funnel.startToGatewayRate}
          detail={`${funnel.lossBeforeGateway} antes do gateway`}
        />
        <FunnelStep
          icon={CheckCircle2}
          label="Pagamento confirmado"
          value={funnel.paid}
          rate={funnel.gatewayToPaidRate}
          detail={`${funnel.lossInsideGateway} dentro do gateway`}
        />
      </div>

      <div className="mt-5 rounded-[16px] border border-white/10 bg-[#08090b] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-bold text-gray-400">Conversao start ate venda</span>
          <span className="text-2xl font-black text-white">{funnel.startToPaidRate}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#b44dff,#ff2a9d)]"
            style={{ width: `${Math.max(4, Math.min(100, funnel.startToPaidRate))}%` }}
          />
        </div>
      </div>
    </section>
  )
}

function FunnelStep({
  icon: Icon,
  label,
  value,
  rate,
  detail,
}: {
  icon: LucideIcon
  label: string
  value: number
  rate: number
  detail: string
}) {
  return (
    <article className="rounded-[16px] border border-white/10 bg-[#08090b] p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-neon-purple/25 bg-neon-purple/10 text-neon-purple">
        <Icon size={18} aria-hidden="true" />
      </span>
      <p className="mt-4 text-[11px] font-black uppercase tracking-[0.14em] text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-white">{formatNumber(value)}</p>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold text-gray-500">
        <span>{detail}</span>
        <span>{rate}%</span>
      </div>
    </article>
  )
}

function WebhookPanel({
  gateways,
  copiedPath,
  onCopy,
}: {
  gateways: PaymentRadarGateway[]
  copiedPath: string | null
  onCopy: (path: string) => void
}) {
  const webhookGateways = gateways.filter((gateway) => gateway.webhookPath)

  return (
    <section id="radar-webhooks" className="scroll-mt-6 rounded-[18px] border border-white/10 bg-[#0c0d10] p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-white">Webhooks dos Gateways</h3>
          <p className="mt-1 text-sm text-gray-500">URLs para receber confirmacoes e status.</p>
        </div>
        <Webhook size={22} className="text-neon-purple" aria-hidden="true" />
      </div>

      <div className="mt-5 space-y-3">
        {webhookGateways.map((gateway) => {
          const receiving = gateway.transactions > 0 || gateway.paid > 0 || Boolean(gateway.lastEventAt)
          const path = gateway.webhookPath as string

          return (
            <article key={gateway.id} className="rounded-[16px] border border-white/10 bg-[#08090b] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-white">{gateway.name}</h4>
                  <p className="mt-1 text-xs text-gray-600">
                    Configure esta URL no painel do gateway.
                  </p>
                </div>
                <span
                  className={cn(
                    'rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]',
                    receiving
                      ? 'border-neon-green/30 bg-neon-green/10 text-neon-green'
                      : 'border-white/10 bg-white/[0.03] text-gray-500',
                  )}
                >
                  {receiving ? 'recebendo eventos' : 'aguardando eventos'}
                </span>
              </div>
              <div className="flex min-w-0 items-center gap-2 rounded-[12px] border border-white/10 bg-black/30 px-3 py-2">
                <code className="min-w-0 flex-1 truncate text-xs text-gray-400">
                  {buildWebhookUrl(path)}
                </code>
                <button
                  type="button"
                  onClick={() => onCopy(path)}
                  className="flex h-8 shrink-0 items-center gap-2 rounded-full border border-neon-purple/25 bg-neon-purple/10 px-3 text-[11px] font-black text-neon-purple transition-colors hover:bg-neon-purple/20"
                >
                  <Copy size={13} aria-hidden="true" />
                  {copiedPath === path ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-white/10 bg-white/[0.025] px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-600">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  )
}

function LoadingBlock() {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-[18px] border border-white/10 bg-[#0c0d10] text-gray-500">
      <Loader2 size={22} className="mr-3 animate-spin" aria-hidden="true" />
      Carregando radar...
    </div>
  )
}

function getHealthMeta(health: PaymentRadarHealth) {
  const map: Record<
    PaymentRadarHealth,
    { label: string; badge: string; bar: string }
  > = {
    operational: {
      label: 'operacional',
      badge: 'border-neon-green/30 bg-neon-green/10 text-neon-green',
      bar: 'bg-neon-green',
    },
    unstable: {
      label: 'instavel',
      badge: 'border-neon-orange/30 bg-neon-orange/10 text-neon-orange',
      bar: 'bg-neon-orange',
    },
    down: {
      label: 'fora do ar',
      badge: 'border-red-500/30 bg-red-500/10 text-red-300',
      bar: 'bg-red-500',
    },
    disconnected: {
      label: 'desconectado',
      badge: 'border-white/10 bg-white/[0.03] text-gray-500',
      bar: 'bg-gray-600',
    },
  }

  return map[health]
}

function buildWebhookUrl(path: string) {
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path}`
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value)
}

function formatUpdatedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Atualizado agora'
  return `Atualizado as ${date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })}`
}

function formatDateTime(value: string | null) {
  if (!value) return 'sem evento'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'sem evento'
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
