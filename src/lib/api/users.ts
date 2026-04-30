import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'

export type LeadStatus = 'novo' | 'pendente' | 'pago' | 'bloqueado'
export type LeadTimeRange = 'today' | 'yesterday' | 'week' | 'month' | 'all'
export type LeadStartsFilter = 'all' | 'one' | 'twoPlus' | 'fivePlus' | 'tenPlus'

export interface LeadFilters {
  search?: string
  timeRange?: LeadTimeRange
  botId?: string
  flowId?: string
  status?: LeadStatus | 'all'
  starts?: LeadStartsFilter
  page?: number
  pageSize?: number
}

export type TelegramLead = Tables<'telegram_leads'>
export type LeadFlowEvent = Tables<'lead_flow_events'>

export interface LeadListItem extends TelegramLead {
  bot: { id: string; name: string } | null
  flow: { id: string; name: string } | null
}

export interface LeadFilterOptions {
  bots: Array<{ id: string; name: string }>
  flows: Array<{ id: string; name: string; bot_id: string | null }>
}

export interface LeadMetrics {
  novos: number
  pendentes: number
  pagos: number
  bloqueados: number
  total: number
}

const leadSelect = `
  *,
  bot:bots(id,name),
  flow:flows(id,name)
`

export async function listLeads(filters: LeadFilters = {}) {
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 35
  const from = Math.max(0, (page - 1) * pageSize)
  const to = from + pageSize - 1

  let query: any = supabase
    .from('telegram_leads')
    .select(leadSelect, { count: 'exact' })
    .order('last_seen_at', { ascending: false })
    .range(from, to)

  query = applyLeadFilters(query, filters, true)

  const { data, error, count } = await query
  if (error) throw error

  return {
    leads: (data ?? []) as LeadListItem[],
    total: count ?? 0,
  }
}

export async function getLeadTimeline(leadId: string, limit = 20) {
  const { data, error } = await supabase
    .from('lead_flow_events')
    .select('*')
    .eq('lead_id', leadId)
    .order('occurred_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return ((data ?? []) as LeadFlowEvent[]).reverse()
}

export async function getLeadMetrics(filters: LeadFilters = {}): Promise<LeadMetrics> {
  const baseFilters = { ...filters, status: 'all' as const }
  const [total, novos, pendentes, pagos, bloqueados] = await Promise.all([
    countLeads(baseFilters),
    countLeads(baseFilters, 'novo'),
    countLeads(baseFilters, 'pendente'),
    countLeads(baseFilters, 'pago'),
    countLeads(baseFilters, 'bloqueado'),
  ])

  return { total, novos, pendentes, pagos, bloqueados }
}

export async function listLeadFilterOptions(): Promise<LeadFilterOptions> {
  const [botsResult, flowsResult] = await Promise.all([
    supabase.from('bots').select('id,name').order('name', { ascending: true }),
    supabase.from('flows').select('id,name,bot_id').order('name', { ascending: true }),
  ])

  if (botsResult.error) throw botsResult.error
  if (flowsResult.error) throw flowsResult.error

  return {
    bots: botsResult.data ?? [],
    flows: flowsResult.data ?? [],
  }
}

async function countLeads(filters: LeadFilters, status?: LeadStatus) {
  let query: any = supabase
    .from('telegram_leads')
    .select('id', { count: 'exact', head: true })

  query = applyLeadFilters(query, filters, false)
  if (status) query = query.eq('status', status)

  const { error, count } = await query
  if (error) throw error
  return count ?? 0
}

function applyLeadFilters(query: any, filters: LeadFilters, includeStatus: boolean) {
  const range = getDateRange(filters.timeRange ?? 'all')

  if (range?.from) query = query.gte('first_seen_at', range.from)
  if (range?.to) query = query.lt('first_seen_at', range.to)

  if (filters.botId && filters.botId !== 'all') {
    query = query.eq('bot_id', filters.botId)
  }

  if (filters.flowId && filters.flowId !== 'all') {
    query = query.eq('flow_id', filters.flowId)
  }

  if (includeStatus && filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters.starts && filters.starts !== 'all') {
    if (filters.starts === 'one') query = query.eq('start_count', 1)
    if (filters.starts === 'twoPlus') query = query.gte('start_count', 2)
    if (filters.starts === 'fivePlus') query = query.gte('start_count', 5)
    if (filters.starts === 'tenPlus') query = query.gte('start_count', 10)
  }

  const search = sanitizeSearchTerm(filters.search)
  if (search) {
    query = query.or(
      [
        `display_name.ilike.%${search}%`,
        `first_name.ilike.%${search}%`,
        `last_name.ilike.%${search}%`,
        `username.ilike.%${search}%`,
        `telegram_user_id.ilike.%${search}%`,
        `telegram_chat_id.ilike.%${search}%`,
        `email.ilike.%${search}%`,
        `phone.ilike.%${search}%`,
      ].join(','),
    )
  }

  return query
}

function getDateRange(range: LeadTimeRange) {
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

function sanitizeSearchTerm(value?: string) {
  return (value ?? '')
    .trim()
    .replace(/[%_,]/g, ' ')
    .replace(/\s+/g, ' ')
}
