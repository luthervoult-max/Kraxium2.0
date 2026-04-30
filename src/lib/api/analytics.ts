import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'

export type AnalyticsTimeRange = 'today' | 'yesterday' | 'week' | 'month' | 'all'
export type AnalyticsRevenueEventType =
  | 'payment_generated'
  | 'payment_confirmed'
  | 'refund'
  | 'upsell'
  | 'downsell'
  | 'order_bump'
  | 'recovery'

export interface AnalyticsFilters {
  timeRange?: AnalyticsTimeRange
  botId?: string
  flowId?: string
  gateway?: string
  source?: string
  type?: AnalyticsRevenueEventType | 'all'
}

export interface AnalyticsFilterOptions {
  bots: Array<{ id: string; name: string }>
  flows: Array<{ id: string; name: string; bot_id: string | null }>
  gateways: string[]
  sources: string[]
  types: AnalyticsRevenueEventType[]
}

export interface AnalyticsOverview {
  interactions: number
  starts: number
  revenueGeneratedCents: number
  revenueConfirmedCents: number
  averageTicketCents: number
  startRate: number
  leadSaleRate: number
  approvalRate: number
  generatedPayments: number
  confirmedPayments: number
}

export interface AnalyticsTimeSeries {
  hourly: Array<{
    hour: string
    generated: number
    paid: number
    generatedAmountCents: number
    paidAmountCents: number
  }>
  weekdays: Array<{
    day: string
    generated: number
    paid: number
    generatedAmountCents: number
    paidAmountCents: number
  }>
  calendar: Array<{
    date: string
    day: number
    generated: number
    paid: number
    revenueCents: number
  }>
  monthLabel: string
}

export interface AnalyticsRankingItem {
  id: string
  label: string
  value: number
  amountCents?: number
  detail?: string
}

export interface AnalyticsRankings {
  topBots: AnalyticsRankingItem[]
  topFlows: AnalyticsRankingItem[]
  topPlans: AnalyticsRankingItem[]
  topTickets: AnalyticsRankingItem[]
  topDays: AnalyticsRankingItem[]
  topCampaigns: AnalyticsRankingItem[]
  topSources: AnalyticsRankingItem[]
  topPositions: AnalyticsRankingItem[]
  topSalesCodes: AnalyticsRankingItem[]
  topCities: AnalyticsRankingItem[]
  topDevices: AnalyticsRankingItem[]
}

export interface AnalyticsFunnel {
  starts: number
  generated: number
  paid: number
  startToGeneratedRate: number
  generatedToPaidRate: number
  startToPaidRate: number
}

export interface AnalyticsAdvancedMetrics {
  upsellRate: MetricRate
  downsellRate: MetricRate
  orderBumpRate: MetricRate
  recoveryRate: MetricRate
  recurrenceRate: MetricRate
  retentionRate: MetricRate
  upgradeRate: MetricRate
  abandonmentRate: MetricRate
  ltvAverageCents: number
  purchasesPerUser: number
  meanReturnDays: number
  meanStartToPaymentMinutes: number
  userCounters: Array<{ label: string; value: number; tone: 'green' | 'purple' | 'orange' | 'blue' | 'gray' | 'red' }>
}

export interface AnalyticsDashboard {
  overview: AnalyticsOverview
  timeSeries: AnalyticsTimeSeries
  rankings: AnalyticsRankings
  funnel: AnalyticsFunnel
  advanced: AnalyticsAdvancedMetrics
}

interface MetricRate {
  rate: number
  numerator: number
  denominator: number
}

type RevenueEvent = Tables<'analytics_revenue_events'>
type Lead = Pick<
  Tables<'telegram_leads'>,
  | 'id'
  | 'bot_id'
  | 'flow_id'
  | 'telegram_user_id'
  | 'status'
  | 'start_count'
  | 'first_seen_at'
  | 'last_seen_at'
  | 'source'
  | 'campaign'
  | 'utm_source'
  | 'utm_campaign'
  | 'utm_content'
  | 'device_type'
  | 'country'
  | 'region'
  | 'city'
  | 'plan_name'
  | 'sales_code'
  | 'metadata'
>
type LeadEvent = Pick<
  Tables<'lead_flow_events'>,
  'id' | 'bot_id' | 'flow_id' | 'lead_id' | 'event_type' | 'node_type' | 'node_label' | 'occurred_at' | 'metadata'
>

interface AnalyticsRows {
  leads: Lead[]
  leadEvents: LeadEvent[]
  revenueEvents: RevenueEvent[]
}

const generatedEventTypes = new Set<AnalyticsRevenueEventType>([
  'payment_generated',
  'upsell',
  'downsell',
  'order_bump',
  'recovery',
])

const revenueEventTypes: AnalyticsRevenueEventType[] = [
  'payment_generated',
  'payment_confirmed',
  'refund',
  'upsell',
  'downsell',
  'order_bump',
  'recovery',
]

export async function getAnalyticsFilters(): Promise<AnalyticsFilterOptions> {
  const [botsResult, flowsResult, revenueResult, leadsResult] = await Promise.all([
    supabase.from('bots').select('id,name').order('name', { ascending: true }),
    supabase.from('flows').select('id,name,bot_id').order('name', { ascending: true }),
    supabase.from('analytics_revenue_events').select('gateway,source,utm_source,campaign,utm_campaign,event_type').limit(5000),
    supabase.from('telegram_leads').select('source,utm_source,campaign,utm_campaign').limit(5000),
  ])

  if (botsResult.error) throw botsResult.error
  if (flowsResult.error) throw flowsResult.error
  if (revenueResult.error) throw revenueResult.error
  if (leadsResult.error) throw leadsResult.error

  return {
    bots: botsResult.data ?? [],
    flows: flowsResult.data ?? [],
    gateways: uniqueStrings((revenueResult.data ?? []).map((row) => row.gateway)),
    sources: uniqueStrings([
      ...(revenueResult.data ?? []).flatMap((row) => [row.source, row.utm_source, row.campaign, row.utm_campaign]),
      ...(leadsResult.data ?? []).flatMap((row) => [row.source, row.utm_source, row.campaign, row.utm_campaign]),
    ]),
    types: uniqueStrings((revenueResult.data ?? []).map((row) => row.event_type))
      .filter((type): type is AnalyticsRevenueEventType => revenueEventTypes.includes(type as AnalyticsRevenueEventType)),
  }
}

export async function getAnalyticsDashboard(filters: AnalyticsFilters = {}): Promise<AnalyticsDashboard> {
  const [rows, botsResult, flowsResult] = await Promise.all([
    loadAnalyticsRows(filters),
    supabase.from('bots').select('id,name'),
    supabase.from('flows').select('id,name'),
  ])

  if (botsResult.error) throw botsResult.error
  if (flowsResult.error) throw flowsResult.error

  return {
    overview: buildAnalyticsOverview(rows),
    timeSeries: buildAnalyticsTimeSeries(rows),
    rankings: buildAnalyticsRankings(rows, botsResult.data ?? [], flowsResult.data ?? []),
    funnel: buildAnalyticsFunnel(rows),
    advanced: buildAnalyticsAdvancedMetrics(rows),
  }
}

export async function getAnalyticsOverview(filters: AnalyticsFilters = {}): Promise<AnalyticsOverview> {
  return buildAnalyticsOverview(await loadAnalyticsRows(filters))
}

function buildAnalyticsOverview({ leads, leadEvents, revenueEvents }: AnalyticsRows): AnalyticsOverview {
  const interactions = new Set(leads.map((lead) => lead.telegram_user_id || lead.id)).size
  const startEvents = leadEvents.filter((event) => event.event_type === 'start')
  const starts = startEvents.length > 0
    ? startEvents.length
    : leads.reduce((total, lead) => total + Number(lead.start_count ?? 0), 0)
  const generated = revenueEvents.filter((event) => generatedEventTypes.has(event.event_type as AnalyticsRevenueEventType))
  const confirmed = revenueEvents.filter((event) => event.event_type === 'payment_confirmed')
  const refunds = revenueEvents.filter((event) => event.event_type === 'refund')
  const revenueGeneratedCents = sumAmount(generated)
  const revenueConfirmedCents = Math.max(0, sumAmount(confirmed) - sumAmount(refunds))

  return {
    interactions,
    starts,
    revenueGeneratedCents,
    revenueConfirmedCents,
    averageTicketCents: confirmed.length === 0 ? 0 : Math.round(revenueConfirmedCents / confirmed.length),
    startRate: percent(starts, interactions),
    leadSaleRate: percent(confirmed.length, starts),
    approvalRate: percent(confirmed.length, generated.length),
    generatedPayments: generated.length,
    confirmedPayments: confirmed.length,
  }
}

export async function getAnalyticsTimeSeries(filters: AnalyticsFilters = {}): Promise<AnalyticsTimeSeries> {
  return buildAnalyticsTimeSeries(await loadAnalyticsRows(filters))
}

function buildAnalyticsTimeSeries({ revenueEvents }: AnalyticsRows): AnalyticsTimeSeries {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const daysInMonth = monthEnd.getDate()
  const monthEvents = revenueEvents.filter((event) => {
    const date = new Date(event.occurred_at)
    return date >= monthStart && date <= new Date(now.getFullYear(), now.getMonth(), daysInMonth, 23, 59, 59)
  })

  const hourly = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${hour}h`,
    generated: 0,
    paid: 0,
    generatedAmountCents: 0,
    paidAmountCents: 0,
  }))

  const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day) => ({
    day,
    generated: 0,
    paid: 0,
    generatedAmountCents: 0,
    paidAmountCents: 0,
  }))

  for (const event of revenueEvents) {
    const date = new Date(event.occurred_at)
    if (Number.isNaN(date.getTime())) continue
    const hourItem = hourly[date.getHours()]
    const weekdayItem = weekdays[(date.getDay() + 6) % 7]
    addRevenueToBucket(hourItem, event)
    addRevenueToBucket(weekdayItem, event)
  }

  const calendar = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1
    const date = new Date(now.getFullYear(), now.getMonth(), day)
    const dayEvents = monthEvents.filter((event) => new Date(event.occurred_at).getDate() === day)
    const generated = dayEvents.filter((event) => generatedEventTypes.has(event.event_type as AnalyticsRevenueEventType))
    const paid = dayEvents.filter((event) => event.event_type === 'payment_confirmed')
    return {
      date: date.toISOString(),
      day,
      generated: generated.length,
      paid: paid.length,
      revenueCents: sumAmount(paid),
    }
  })

  return {
    hourly,
    weekdays,
    calendar,
    monthLabel: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(now),
  }
}

export async function getAnalyticsRankings(filters: AnalyticsFilters = {}): Promise<AnalyticsRankings> {
  const [rows, botsResult, flowsResult] = await Promise.all([
    loadAnalyticsRows(filters),
    supabase.from('bots').select('id,name'),
    supabase.from('flows').select('id,name'),
  ])

  if (botsResult.error) throw botsResult.error
  if (flowsResult.error) throw flowsResult.error

  return buildAnalyticsRankings(rows, botsResult.data ?? [], flowsResult.data ?? [])
}

function buildAnalyticsRankings(
  { revenueEvents, leads }: AnalyticsRows,
  bots: Array<{ id: string; name: string }>,
  flows: Array<{ id: string; name: string }>,
): AnalyticsRankings {
  const botNames = new Map(bots.map((bot) => [bot.id, bot.name]))
  const flowNames = new Map(flows.map((flow) => [flow.id, flow.name]))
  const confirmed = revenueEvents.filter((event) => event.event_type === 'payment_confirmed')

  return {
    topBots: rankRevenue(confirmed, (event) => event.bot_id, (id) => botNames.get(id) ?? 'Bot removido'),
    topFlows: rankRevenue(confirmed, (event) => event.flow_id, (id) => flowNames.get(id) ?? 'Fluxo removido'),
    topPlans: rankRevenue(confirmed, (event) => event.plan_name, (id) => id),
    topTickets: rankRevenue(confirmed, (event) => String(event.amount_cents), (id) => formatCents(Number(id))),
    topDays: rankRevenue(confirmed, (event) => toDateKey(event.occurred_at), (id) => formatDateKey(id)),
    topCampaigns: rankRevenueOrCount(confirmed, leads, (event) => event.campaign ?? event.utm_campaign, (lead) => lead.campaign ?? lead.utm_campaign),
    topSources: rankRevenueOrCount(confirmed, leads, (event) => event.source ?? event.utm_source, (lead) => lead.source ?? lead.utm_source),
    topPositions: rankRevenueOrCount(confirmed, leads, (event) => event.utm_content, (lead) => lead.utm_content),
    topSalesCodes: rankRevenue(confirmed, (event) => event.sales_code, (id) => id),
    topCities: rankLeadCount(leads, (lead) => lead.city),
    topDevices: rankLeadCount(leads, (lead) => lead.device_type),
  }
}

export async function getAnalyticsFunnel(filters: AnalyticsFilters = {}): Promise<AnalyticsFunnel> {
  return buildAnalyticsFunnel(await loadAnalyticsRows(filters))
}

function buildAnalyticsFunnel({ leads, leadEvents, revenueEvents }: AnalyticsRows): AnalyticsFunnel {
  const startEvents = leadEvents.filter((event) => event.event_type === 'start')
  const starts = startEvents.length > 0
    ? startEvents.length
    : leads.reduce((total, lead) => total + Number(lead.start_count ?? 0), 0)
  const generated = revenueEvents.filter((event) => generatedEventTypes.has(event.event_type as AnalyticsRevenueEventType)).length
  const paidEvents = revenueEvents.filter((event) => event.event_type === 'payment_confirmed')
  const paidLeadFallback = paidEvents.length === 0 ? leads.filter((lead) => lead.status === 'pago').length : 0
  const paid = paidEvents.length + paidLeadFallback

  return {
    starts,
    generated,
    paid,
    startToGeneratedRate: percent(generated, starts),
    generatedToPaidRate: percent(paid, generated),
    startToPaidRate: percent(paid, starts),
  }
}

export async function getAnalyticsAdvancedMetrics(filters: AnalyticsFilters = {}): Promise<AnalyticsAdvancedMetrics> {
  return buildAnalyticsAdvancedMetrics(await loadAnalyticsRows(filters))
}

function buildAnalyticsAdvancedMetrics({ leads, leadEvents, revenueEvents }: AnalyticsRows): AnalyticsAdvancedMetrics {
  const generated = revenueEvents.filter((event) => generatedEventTypes.has(event.event_type as AnalyticsRevenueEventType))
  const confirmed = revenueEvents.filter((event) => event.event_type === 'payment_confirmed')
  const paidLeadIds = new Set(confirmed.map((event) => event.lead_id).filter(Boolean) as string[])
  const uniquePaidUsers = paidLeadIds.size || leads.filter((lead) => lead.status === 'pago').length
  const starts = leadEvents.filter((event) => event.event_type === 'start').length || leads.reduce((total, lead) => total + Number(lead.start_count ?? 0), 0)
  const pendingLeads = leads.filter((lead) => lead.status === 'pendente').length
  const totalLeads = leads.length
  const recurringBuyers = countRecurringBuyers(confirmed)
  const upsellers = countRevenueType(revenueEvents, 'upsell')
  const downsellers = countRevenueType(revenueEvents, 'downsell')
  const recovered = countRevenueType(revenueEvents, 'recovery')
  const abandoned = Math.max(0, starts - confirmed.length)
  const vipBuyers = leads.filter((lead) => /vip/i.test(lead.plan_name ?? '') || /vip/i.test(String(readMetadata(lead.metadata, 'plan_name') ?? ''))).length

  return {
    upsellRate: makeRate(upsellers, uniquePaidUsers || generated.length),
    downsellRate: makeRate(downsellers, generated.length),
    orderBumpRate: makeRate(countRevenueType(revenueEvents, 'order_bump'), generated.length),
    recoveryRate: makeRate(recovered, pendingLeads),
    recurrenceRate: makeRate(recurringBuyers, uniquePaidUsers),
    retentionRate: makeRate(leads.filter((lead) => lead.status === 'pago').length, totalLeads),
    upgradeRate: makeRate(upsellers, uniquePaidUsers),
    abandonmentRate: makeRate(abandoned, starts),
    ltvAverageCents: uniquePaidUsers === 0 ? 0 : Math.round(sumAmount(confirmed) / uniquePaidUsers),
    purchasesPerUser: uniquePaidUsers === 0 ? 0 : roundOne(confirmed.length / uniquePaidUsers),
    meanReturnDays: roundOne(meanReturnDays(confirmed)),
    meanStartToPaymentMinutes: roundOne(meanStartToPaymentMinutes(leadEvents, confirmed)),
    userCounters: [
      { label: 'Total Compradores', value: uniquePaidUsers, tone: 'gray' },
      { label: 'Recorrentes', value: recurringBuyers, tone: 'blue' },
      { label: 'VIPs Ativos', value: vipBuyers, tone: 'orange' },
      { label: 'Upsellers', value: upsellers, tone: 'green' },
      { label: 'Downsellers', value: downsellers, tone: 'orange' },
      { label: 'Recuperados', value: recovered, tone: 'purple' },
      { label: 'Abandonos', value: abandoned, tone: abandoned > 0 ? 'red' : 'gray' },
    ],
  }
}

async function loadAnalyticsRows(filters: AnalyticsFilters) {
  const range = getDateRange(filters.timeRange ?? 'today')
  const [leadsResult, leadEventsResult, revenueResult] = await Promise.all([
    loadLeads(filters, range),
    loadLeadEvents(filters, range),
    loadRevenueEvents(filters, range),
  ])

  const source = normalizeFilter(filters.source)
  const leads = source
    ? leadsResult.filter((lead) => matchesSource(source, [lead.source, lead.utm_source, lead.campaign, lead.utm_campaign]))
    : leadsResult
  const revenueEvents = source
    ? revenueResult.filter((event) => matchesSource(source, [event.source, event.utm_source, event.campaign, event.utm_campaign]))
    : revenueResult
  const sourceLeadIds = source ? new Set(leads.map((lead) => lead.id)) : null
  const leadEvents = sourceLeadIds
    ? leadEventsResult.filter((event) => sourceLeadIds.has(event.lead_id))
    : leadEventsResult

  return {
    leads,
    leadEvents,
    revenueEvents,
  }
}

async function loadLeads(filters: AnalyticsFilters, range: DateRange | null) {
  let query: any = supabase
    .from('telegram_leads')
    .select(`
      id,
      bot_id,
      flow_id,
      telegram_user_id,
      status,
      start_count,
      first_seen_at,
      last_seen_at,
      source,
      campaign,
      utm_source,
      utm_campaign,
      utm_content,
      device_type,
      country,
      region,
      city,
      plan_name,
      sales_code,
      metadata
    `)
    .order('last_seen_at', { ascending: false })
    .limit(10000)

  query = applyCommonFilters(query, filters)
  if (range?.from) query = query.gte('last_seen_at', range.from)
  if (range?.to) query = query.lt('last_seen_at', range.to)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Lead[]
}

async function loadLeadEvents(filters: AnalyticsFilters, range: DateRange | null) {
  let query: any = supabase
    .from('lead_flow_events')
    .select('id,bot_id,flow_id,lead_id,event_type,node_type,node_label,occurred_at,metadata')
    .order('occurred_at', { ascending: false })
    .limit(10000)

  query = applyCommonFilters(query, filters)
  if (range?.from) query = query.gte('occurred_at', range.from)
  if (range?.to) query = query.lt('occurred_at', range.to)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as LeadEvent[]
}

async function loadRevenueEvents(filters: AnalyticsFilters, range: DateRange | null) {
  let query: any = supabase
    .from('analytics_revenue_events')
    .select('*')
    .order('occurred_at', { ascending: false })
    .limit(10000)

  query = applyCommonFilters(query, filters)
  if (range?.from) query = query.gte('occurred_at', range.from)
  if (range?.to) query = query.lt('occurred_at', range.to)

  const gateway = normalizeFilter(filters.gateway)
  if (gateway) query = query.eq('gateway', gateway)

  const type = normalizeFilter(filters.type)
  if (type) query = query.eq('event_type', type)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as RevenueEvent[]
}

function applyCommonFilters(query: any, filters: AnalyticsFilters) {
  const botId = normalizeFilter(filters.botId)
  const flowId = normalizeFilter(filters.flowId)

  if (botId) query = query.eq('bot_id', botId)
  if (flowId) query = query.eq('flow_id', flowId)

  return query
}

interface DateRange {
  from: string | null
  to: string | null
}

function getDateRange(range: AnalyticsTimeRange): DateRange | null {
  if (range === 'all') return null

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (range === 'today') {
    const tomorrow = new Date(todayStart)
    tomorrow.setDate(todayStart.getDate() + 1)
    return { from: todayStart.toISOString(), to: tomorrow.toISOString() }
  }

  if (range === 'yesterday') {
    const yesterday = new Date(todayStart)
    yesterday.setDate(todayStart.getDate() - 1)
    return { from: yesterday.toISOString(), to: todayStart.toISOString() }
  }

  if (range === 'week') {
    const weekStart = new Date(todayStart)
    weekStart.setDate(todayStart.getDate() - 6)
    return { from: weekStart.toISOString(), to: null }
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  return { from: monthStart.toISOString(), to: null }
}

function addRevenueToBucket(
  bucket: {
    generated: number
    paid: number
    generatedAmountCents: number
    paidAmountCents: number
  },
  event: RevenueEvent,
) {
  if (generatedEventTypes.has(event.event_type as AnalyticsRevenueEventType)) {
    bucket.generated += 1
    bucket.generatedAmountCents += Number(event.amount_cents ?? 0)
  }

  if (event.event_type === 'payment_confirmed') {
    bucket.paid += 1
    bucket.paidAmountCents += Number(event.amount_cents ?? 0)
  }
}

function rankRevenue(
  events: RevenueEvent[],
  getKey: (event: RevenueEvent) => string | null,
  getLabel: (id: string) => string,
  limit = 5,
): AnalyticsRankingItem[] {
  const grouped = new Map<string, { value: number; amountCents: number }>()

  for (const event of events) {
    const key = getKey(event)?.trim()
    if (!key) continue
    const current = grouped.get(key) ?? { value: 0, amountCents: 0 }
    current.value += 1
    current.amountCents += Number(event.amount_cents ?? 0)
    grouped.set(key, current)
  }

  return [...grouped.entries()]
    .map(([id, item]) => ({ id, label: getLabel(id), value: item.value, amountCents: item.amountCents }))
    .sort((a, b) => (b.amountCents ?? 0) - (a.amountCents ?? 0) || b.value - a.value)
    .slice(0, limit)
}

function rankRevenueOrCount(
  events: RevenueEvent[],
  leads: Lead[],
  getRevenueKey: (event: RevenueEvent) => string | null,
  getLeadKey: (lead: Lead) => string | null,
  limit = 5,
) {
  const revenueRank = rankRevenue(events, getRevenueKey, (id) => id, limit)
  if (revenueRank.length > 0) return revenueRank
  return rankLeadCount(leads, getLeadKey, limit)
}

function rankLeadCount(
  leads: Lead[],
  getKey: (lead: Lead) => string | null,
  limit = 5,
): AnalyticsRankingItem[] {
  const grouped = new Map<string, number>()

  for (const lead of leads) {
    const key = getKey(lead)?.trim()
    if (!key) continue
    grouped.set(key, (grouped.get(key) ?? 0) + 1)
  }

  return [...grouped.entries()]
    .map(([id, value]) => ({ id, label: id, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

function countRevenueType(events: RevenueEvent[], type: AnalyticsRevenueEventType) {
  return events.filter((event) => event.event_type === type).length
}

function countRecurringBuyers(events: RevenueEvent[]) {
  const byLead = new Map<string, number>()
  for (const event of events) {
    if (!event.lead_id) continue
    byLead.set(event.lead_id, (byLead.get(event.lead_id) ?? 0) + 1)
  }
  return [...byLead.values()].filter((count) => count > 1).length
}

function meanReturnDays(events: RevenueEvent[]) {
  const byLead = new Map<string, Date[]>()
  for (const event of events) {
    if (!event.lead_id) continue
    const date = new Date(event.occurred_at)
    if (Number.isNaN(date.getTime())) continue
    const dates = byLead.get(event.lead_id) ?? []
    dates.push(date)
    byLead.set(event.lead_id, dates)
  }

  const gaps: number[] = []
  for (const dates of byLead.values()) {
    dates.sort((a, b) => a.getTime() - b.getTime())
    for (let index = 1; index < dates.length; index += 1) {
      gaps.push((dates[index].getTime() - dates[index - 1].getTime()) / 86_400_000)
    }
  }

  if (gaps.length === 0) return 0
  return gaps.reduce((total, value) => total + value, 0) / gaps.length
}

function meanStartToPaymentMinutes(leadEvents: LeadEvent[], payments: RevenueEvent[]) {
  const startByLead = new Map<string, Date>()

  for (const event of leadEvents) {
    if (event.event_type !== 'start') continue
    const date = new Date(event.occurred_at)
    if (Number.isNaN(date.getTime())) continue
    const existing = startByLead.get(event.lead_id)
    if (!existing || date < existing) startByLead.set(event.lead_id, date)
  }

  const gaps: number[] = []
  for (const payment of payments) {
    if (!payment.lead_id) continue
    const start = startByLead.get(payment.lead_id)
    if (!start) continue
    const paidAt = new Date(payment.occurred_at)
    if (Number.isNaN(paidAt.getTime()) || paidAt < start) continue
    gaps.push((paidAt.getTime() - start.getTime()) / 60_000)
  }

  if (gaps.length === 0) return 0
  return gaps.reduce((total, value) => total + value, 0) / gaps.length
}

function sumAmount(events: RevenueEvent[]) {
  return events.reduce((total, event) => total + Number(event.amount_cents ?? 0), 0)
}

function makeRate(numerator: number, denominator: number): MetricRate {
  return {
    numerator,
    denominator,
    rate: percent(numerator, denominator),
  }
}

function percent(value: number, total: number) {
  if (!total) return 0
  return roundOne((value / total) * 100)
}

function roundOne(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 10) / 10
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b))
}

function normalizeFilter(value?: string | null) {
  const normalized = value?.trim()
  if (!normalized || normalized === 'all') return null
  return normalized
}

function matchesSource(source: string, values: Array<string | null>) {
  return values.some((value) => value?.trim().toLowerCase() === source.toLowerCase())
}

function toDateKey(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return date.toISOString().slice(0, 10)
}

function formatDateKey(value: string) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date)
}

function formatCents(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value / 100)
}

function readMetadata(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  return (metadata as Record<string, unknown>)[key]
}
