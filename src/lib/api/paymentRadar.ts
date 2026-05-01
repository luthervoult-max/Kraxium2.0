import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'

export type PaymentRadarPeriod = '24h' | '7d' | '30d'
export type PaymentRadarProvider = 'all' | 'mercado_pago' | 'pushinpay' | 'syncpay' | 'stripe'
export type PaymentRadarStatusFilter = 'all' | 'paid' | 'pending' | 'failed'
export type PaymentRadarHealth = 'operational' | 'unstable' | 'down' | 'disconnected'

export interface PaymentRadarFilters {
  period?: PaymentRadarPeriod
  provider?: PaymentRadarProvider
  botId?: string
  flowId?: string
  status?: PaymentRadarStatusFilter
}

export interface PaymentRadarGatewayDefinition {
  id: Exclude<PaymentRadarProvider, 'all'>
  name: string
  shortName: string
  method: 'pix' | 'card'
  description: string
  webhookPath: string | null
}

export interface PaymentRadarOverview {
  gatewayLeads: number
  paid: number
  pending: number
  failedOrExpired: number
  conversionRate: number
  revenueConfirmedCents: number
}

export interface PaymentRadarGateway {
  id: Exclude<PaymentRadarProvider, 'all'>
  name: string
  shortName: string
  method: 'pix' | 'card'
  description: string
  connected: boolean
  connectionStatus: string | null
  health: PaymentRadarHealth
  transactions: number
  paid: number
  pending: number
  failedOrExpired: number
  conversionRate: number
  failureRate: number
  revenueConfirmedCents: number
  lastEventAt: string | null
  webhookPath: string | null
}

export interface PaymentRadarFunnel {
  starts: number
  reachedGateway: number
  paid: number
  lossBeforeGateway: number
  lossInsideGateway: number
  startToGatewayRate: number
  gatewayToPaidRate: number
  startToPaidRate: number
}

export interface PaymentRadarOptions {
  bots: Array<{ id: string; name: string }>
  flows: Array<{ id: string; name: string; bot_id: string | null }>
}

export interface PaymentRadarDashboard {
  overview: PaymentRadarOverview
  gateways: PaymentRadarGateway[]
  funnel: PaymentRadarFunnel
  options: PaymentRadarOptions
  rangeLabel: string
  updatedAt: string
}

type PixTransaction = Pick<
  Tables<'pix_payment_transactions'>,
  | 'id'
  | 'bot_id'
  | 'flow_id'
  | 'provider'
  | 'status'
  | 'amount_cents'
  | 'created_at'
  | 'updated_at'
  | 'paid_at'
  | 'provider_status'
>

type GatewayConnection = Pick<
  Tables<'payment_gateway_connections'>,
  'id' | 'provider' | 'status' | 'scope' | 'flow_ids' | 'updated_at'
>

type LeadFlowEvent = Pick<Tables<'lead_flow_events'>, 'id' | 'bot_id' | 'flow_id' | 'event_type' | 'occurred_at'>
type Lead = Pick<Tables<'telegram_leads'>, 'id' | 'bot_id' | 'flow_id' | 'start_count' | 'last_seen_at'>
type RevenueEvent = Pick<
  Tables<'analytics_revenue_events'>,
  'id' | 'bot_id' | 'flow_id' | 'gateway' | 'event_type' | 'amount_cents' | 'occurred_at'
>

export const PAYMENT_RADAR_GATEWAYS: PaymentRadarGatewayDefinition[] = [
  {
    id: 'mercado_pago',
    name: 'Mercado Pago',
    shortName: 'MP',
    method: 'pix',
    description: 'PIX e cartao pelo ecossistema Mercado Livre.',
    webhookPath: '/api/payment-webhooks/mercado-pago',
  },
  {
    id: 'pushinpay',
    name: 'PushinPay',
    shortName: 'PP',
    method: 'pix',
    description: 'Gateway focado em pagamentos via PIX.',
    webhookPath: '/api/payment-webhooks/pushinpay',
  },
  {
    id: 'syncpay',
    name: 'SyncPay',
    shortName: 'SP',
    method: 'pix',
    description: 'PIX com credenciais Client ID e Secret.',
    webhookPath: '/api/payment-webhooks/syncpay',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    shortName: 'ST',
    method: 'card',
    description: 'Cartao preparado para etapa futura de cobranca real.',
    webhookPath: null,
  },
]

const failedStatuses = new Set(['failed', 'expired', 'canceled'])
const generatedRevenueEvents = new Set(['payment_generated', 'upsell', 'downsell', 'order_bump', 'recovery'])

export async function getPaymentRadarDashboard(
  filters: PaymentRadarFilters = {},
): Promise<PaymentRadarDashboard> {
  const normalizedFilters = normalizeFilters(filters)
  const range = getRange(normalizedFilters.period)

  const [
    pixResult,
    revenueResult,
    connectionsResult,
    botsResult,
    flowsResult,
    leadEventsResult,
    leadsResult,
  ] = await Promise.all([
    supabase
      .from('pix_payment_transactions')
      .select('id,bot_id,flow_id,provider,status,amount_cents,created_at,updated_at,paid_at,provider_status')
      .gte('created_at', range.from)
      .order('created_at', { ascending: false })
      .limit(10000),
    supabase
      .from('analytics_revenue_events')
      .select('id,bot_id,flow_id,gateway,event_type,amount_cents,occurred_at')
      .gte('occurred_at', range.from)
      .order('occurred_at', { ascending: false })
      .limit(10000),
    supabase
      .from('payment_gateway_connections')
      .select('id,provider,status,scope,flow_ids,updated_at'),
    supabase.from('bots').select('id,name').order('name', { ascending: true }),
    supabase.from('flows').select('id,name,bot_id').order('name', { ascending: true }),
    supabase
      .from('lead_flow_events')
      .select('id,bot_id,flow_id,event_type,occurred_at')
      .eq('event_type', 'start')
      .gte('occurred_at', range.from)
      .limit(10000),
    supabase
      .from('telegram_leads')
      .select('id,bot_id,flow_id,start_count,last_seen_at')
      .gte('last_seen_at', range.from)
      .limit(10000),
  ])

  if (pixResult.error) throw new Error(formatRadarError('transacoes Pix', pixResult.error.message))
  if (revenueResult.error) throw new Error(formatRadarError('eventos financeiros', revenueResult.error.message))
  if (connectionsResult.error) throw new Error(formatRadarError('gateways conectados', connectionsResult.error.message))
  if (botsResult.error) throw new Error(formatRadarError('bots', botsResult.error.message))
  if (flowsResult.error) throw new Error(formatRadarError('fluxos', flowsResult.error.message))
  if (leadEventsResult.error) throw new Error(formatRadarError('starts do fluxo', leadEventsResult.error.message))
  if (leadsResult.error) throw new Error(formatRadarError('leads', leadsResult.error.message))

  const rows = {
    pixTransactions: (pixResult.data ?? []) as PixTransaction[],
    revenueEvents: (revenueResult.data ?? []) as RevenueEvent[],
    connections: (connectionsResult.data ?? []) as GatewayConnection[],
    leadEvents: (leadEventsResult.data ?? []) as LeadFlowEvent[],
    leads: (leadsResult.data ?? []) as Lead[],
  }

  return buildPaymentRadarDashboard({
    ...rows,
    bots: botsResult.data ?? [],
    flows: flowsResult.data ?? [],
    filters: normalizedFilters,
    rangeLabel: range.label,
  })
}

export function buildPaymentRadarDashboard(input: {
  pixTransactions: PixTransaction[]
  revenueEvents: RevenueEvent[]
  connections: GatewayConnection[]
  bots: Array<{ id: string; name: string }>
  flows: Array<{ id: string; name: string; bot_id: string | null }>
  leadEvents: LeadFlowEvent[]
  leads: Lead[]
  filters: Required<PaymentRadarFilters>
  rangeLabel: string
}): PaymentRadarDashboard {
  const pixByCommonFilters = input.pixTransactions.filter((transaction) =>
    matchesCommonFilters(transaction, input.filters),
  )
  const pixByProvider = pixByCommonFilters.filter((transaction) =>
    input.filters.provider === 'all' ? true : transaction.provider === input.filters.provider,
  )
  const pixTransactions = pixByProvider.filter((transaction) => matchesStatus(transaction, input.filters.status))

  const revenueEvents = input.revenueEvents
    .filter((event) => matchesCommonFilters(event, input.filters))
    .filter((event) => input.filters.provider === 'all' ? true : event.gateway === input.filters.provider)

  const overview = buildOverview(pixTransactions)
  const starts = countStarts(input.leadEvents, input.leads, input.filters)
  const funnel = buildFunnel(starts, overview.gatewayLeads, overview.paid)
  const gateways = PAYMENT_RADAR_GATEWAYS.map((gateway) =>
    buildGatewayRadar(gateway, input.connections, pixByProvider, revenueEvents, input.filters),
  )

  return {
    overview,
    gateways,
    funnel,
    options: {
      bots: input.bots,
      flows: input.flows,
    },
    rangeLabel: input.rangeLabel,
    updatedAt: new Date().toISOString(),
  }
}

function buildOverview(transactions: PixTransaction[]): PaymentRadarOverview {
  const paid = transactions.filter((transaction) => transaction.status === 'paid')
  const pending = transactions.filter((transaction) => transaction.status === 'pending')
  const failedOrExpired = transactions.filter((transaction) => failedStatuses.has(transaction.status))

  return {
    gatewayLeads: transactions.length,
    paid: paid.length,
    pending: pending.length,
    failedOrExpired: failedOrExpired.length,
    conversionRate: percent(paid.length, transactions.length),
    revenueConfirmedCents: sumCents(paid),
  }
}

function buildGatewayRadar(
  gateway: PaymentRadarGatewayDefinition,
  connections: GatewayConnection[],
  transactions: PixTransaction[],
  revenueEvents: RevenueEvent[],
  filters: Required<PaymentRadarFilters>,
): PaymentRadarGateway {
  const connection = connections.find((item) => item.provider === gateway.id) ?? null
  const gatewayTransactions =
    gateway.id === 'stripe'
      ? []
      : transactions
          .filter((transaction) => transaction.provider === gateway.id)
          .filter((transaction) => matchesStatus(transaction, filters.status))
  const paid = gatewayTransactions.filter((transaction) => transaction.status === 'paid')
  const pending = gatewayTransactions.filter((transaction) => transaction.status === 'pending')
  const failedOrExpired = gatewayTransactions.filter((transaction) => failedStatuses.has(transaction.status))
  const conversionRate = percent(paid.length, gatewayTransactions.length)
  const failureRate = percent(failedOrExpired.length, gatewayTransactions.length)
  const gatewayRevenueEvents = revenueEvents.filter((event) => event.gateway === gateway.id)
  const lastEventAt = latestDate([
    ...gatewayTransactions.flatMap((transaction) => [
      transaction.updated_at,
      transaction.paid_at,
      transaction.created_at,
    ]),
    ...gatewayRevenueEvents.map((event) => event.occurred_at),
  ])
  const connected = connection?.status === 'connected'

  return {
    ...gateway,
    connected,
    connectionStatus: connection?.status ?? null,
    health: getGatewayHealth(connection, gatewayTransactions, failureRate),
    transactions: gatewayTransactions.length,
    paid: paid.length,
    pending: pending.length,
    failedOrExpired: failedOrExpired.length,
    conversionRate,
    failureRate,
    revenueConfirmedCents: sumCents(paid) + confirmedNonPixRevenue(gateway, gatewayRevenueEvents),
    lastEventAt,
  }
}

function confirmedNonPixRevenue(gateway: PaymentRadarGatewayDefinition, events: RevenueEvent[]) {
  if (gateway.method === 'pix') return 0
  return sumCents(events.filter((event) => event.event_type === 'payment_confirmed'))
}

function buildFunnel(starts: number, reachedGateway: number, paid: number): PaymentRadarFunnel {
  const lossBeforeGateway = Math.max(0, starts - reachedGateway)
  const lossInsideGateway = Math.max(0, reachedGateway - paid)

  return {
    starts,
    reachedGateway,
    paid,
    lossBeforeGateway,
    lossInsideGateway,
    startToGatewayRate: percent(reachedGateway, starts),
    gatewayToPaidRate: percent(paid, reachedGateway),
    startToPaidRate: percent(paid, starts),
  }
}

function getGatewayHealth(
  connection: GatewayConnection | null,
  transactions: PixTransaction[],
  failureRate: number,
): PaymentRadarHealth {
  if (!connection) return 'disconnected'
  if (connection.status !== 'connected') return 'unstable'
  if (transactions.length > 0 && failureRate >= 100) return 'down'
  if (failureRate > 10) return 'unstable'
  return 'operational'
}

function countStarts(
  leadEvents: LeadFlowEvent[],
  leads: Lead[],
  filters: Required<PaymentRadarFilters>,
) {
  const filteredEvents = leadEvents.filter((event) => matchesCommonFilters(event, filters))
  if (filteredEvents.length > 0) return filteredEvents.length

  return leads
    .filter((lead) => matchesCommonFilters(lead, filters))
    .reduce((total, lead) => total + Number(lead.start_count ?? 0), 0)
}

function matchesCommonFilters(
  row: { bot_id?: string | null; flow_id?: string | null },
  filters: Required<PaymentRadarFilters>,
) {
  if (filters.botId !== 'all' && row.bot_id !== filters.botId) return false
  if (filters.flowId !== 'all' && row.flow_id !== filters.flowId) return false
  return true
}

function matchesStatus(transaction: PixTransaction, status: PaymentRadarStatusFilter) {
  if (status === 'all') return true
  if (status === 'failed') return failedStatuses.has(transaction.status)
  return transaction.status === status
}

function normalizeFilters(filters: PaymentRadarFilters): Required<PaymentRadarFilters> {
  return {
    period: filters.period ?? '24h',
    provider: filters.provider ?? 'all',
    botId: filters.botId ?? 'all',
    flowId: filters.flowId ?? 'all',
    status: filters.status ?? 'all',
  }
}

function getRange(period: PaymentRadarPeriod) {
  const now = Date.now()
  const hours = period === '24h' ? 24 : period === '7d' ? 24 * 7 : 24 * 30
  const from = new Date(now - hours * 60 * 60 * 1000).toISOString()
  const label = period === '24h' ? 'ultimas 24h' : period === '7d' ? 'ultimos 7 dias' : 'ultimos 30 dias'
  return { from, label }
}

function percent(value: number, total: number) {
  if (total <= 0) return 0
  return Number(((value / total) * 100).toFixed(1))
}

function sumCents(rows: Array<{ amount_cents: number | null }>) {
  return rows.reduce((total, row) => total + Number(row.amount_cents ?? 0), 0)
}

function latestDate(values: Array<string | null | undefined>) {
  const timestamps = values
    .map((value) => (value ? new Date(value).getTime() : Number.NaN))
    .filter((value) => Number.isFinite(value))

  if (timestamps.length === 0) return null
  return new Date(Math.max(...timestamps)).toISOString()
}

function formatRadarError(label: string, message: string) {
  if (message.includes('pix_payment_transactions')) {
    return 'Tabela Pix ainda nao configurada no Supabase. Aplique a migration Pix para ativar o Radar de Pagamentos.'
  }

  if (/permission|policy|rls/i.test(message)) {
    return `Sem permissao para carregar ${label}. Verifique as politicas RLS dessa tabela.`
  }

  return `Falha ao carregar ${label}: ${message}`
}

export function isGeneratedRevenueEvent(type: string | null) {
  return generatedRevenueEvents.has(String(type ?? ''))
}
