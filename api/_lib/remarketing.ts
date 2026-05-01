import { HttpError } from './http.js'
import { serviceSupabase } from './supabase.js'
import { sendMessage } from './telegram.js'

export type RemarketingCampaignStatus = 'draft' | 'ready' | 'sending' | 'sent' | 'paused' | 'failed'
export type RemarketingRecipientStatus = 'queued' | 'sent' | 'failed' | 'skipped'
export type RemarketingLeadStatus = 'all' | 'novo' | 'pendente' | 'pago'
export type RemarketingStartsFilter = 'all' | 'one' | 'twoPlus' | 'fivePlus' | 'tenPlus'
export type RemarketingLastSeenFilter = 'all' | 'today' | 'week' | 'month'

export interface RemarketingFilters {
  botId: string
  flowId: string | null
  leadStatus: RemarketingLeadStatus
  starts: RemarketingStartsFilter
  lastSeen: RemarketingLastSeenFilter
}

export interface PublicRemarketingCampaign {
  id: string
  name: string
  message: string
  status: RemarketingCampaignStatus
  botId: string
  botName: string
  flowId: string | null
  flowName: string | null
  filters: RemarketingFilters
  audienceCount: number
  queuedCount: number
  sentCount: number
  failedCount: number
  skippedCount: number
  revenueCents: number
  lastPreparedAt: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface RemarketingSummary {
  totalCampaigns: number
  activeCampaigns: number
  messagesSent: number
  revenueCents: number
}

export interface RemarketingDashboard {
  summary: RemarketingSummary
  campaigns: PublicRemarketingCampaign[]
}

interface CampaignRow {
  id: string
  owner_id: string
  bot_id: string
  flow_id: string | null
  name: string
  message: string
  filters: unknown
  status: string
  audience_count: number
  sent_count: number
  failed_count: number
  last_prepared_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  bot?: { id: string; name: string } | null
  flow?: { id: string; name: string } | null
}

interface RecipientRow {
  id: string
  campaign_id: string
  owner_id: string
  lead_id: string
  bot_id: string
  flow_id: string | null
  telegram_chat_id: string
  rendered_message: string
  status: string
  error_message: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

interface LeadAudienceRow {
  id: string
  bot_id: string
  flow_id: string | null
  telegram_chat_id: string | null
  display_name: string | null
  first_name: string | null
  last_name: string | null
  username: string | null
  status: string
  start_count: number
  last_seen_at: string
  bot?: { id: string; name: string } | null
  flow?: { id: string; name: string } | null
}

interface RevenueRow {
  lead_id: string | null
  amount_cents: number
  occurred_at: string
}

export interface RemarketingPreviewLead {
  id: string
  name: string
  botName: string
  flowName: string | null
  status: string
  starts: number
  lastSeenAt: string
}

export interface SaveRemarketingInput {
  campaignId?: unknown
  name?: unknown
  message?: unknown
  filters?: unknown
}

const campaignStatuses = new Set<RemarketingCampaignStatus>([
  'draft',
  'ready',
  'sending',
  'sent',
  'paused',
  'failed',
])
const leadStatuses = new Set<RemarketingLeadStatus>(['all', 'novo', 'pendente', 'pago'])
const startFilters = new Set<RemarketingStartsFilter>(['all', 'one', 'twoPlus', 'fivePlus', 'tenPlus'])
const lastSeenFilters = new Set<RemarketingLastSeenFilter>(['all', 'today', 'week', 'month'])
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const maxCampaigns = 10

export async function listRemarketingDashboard(ownerId: string): Promise<RemarketingDashboard> {
  const { data, error } = await serviceSupabase
    .from('remarketing_campaigns')
    .select('*, bot:bots(id,name), flow:flows(id,name)')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })

  if (error) throw error

  const campaigns = (data ?? []) as CampaignRow[]
  const campaignIds = campaigns.map((campaign) => campaign.id)
  const recipients = await listRecipients(ownerId, campaignIds)
  const revenueByCampaign = await getRevenueByCampaign(ownerId, recipients)
  const recipientsByCampaign = groupRecipients(recipients)
  const publicCampaigns = campaigns.map((campaign) =>
    toPublicCampaign(campaign, recipientsByCampaign.get(campaign.id) ?? [], revenueByCampaign.get(campaign.id) ?? 0),
  )

  return {
    campaigns: publicCampaigns,
    summary: {
      totalCampaigns: publicCampaigns.length,
      activeCampaigns: publicCampaigns.filter((campaign) => campaign.status === 'ready' || campaign.status === 'sending').length,
      messagesSent: publicCampaigns.reduce((total, campaign) => total + campaign.sentCount, 0),
      revenueCents: publicCampaigns.reduce((total, campaign) => total + campaign.revenueCents, 0),
    },
  }
}

export async function previewRemarketingAudience(ownerId: string, rawFilters: unknown) {
  const filters = normalizeRemarketingFilters(rawFilters)
  const audience = await buildAudience(ownerId, filters)

  return {
    count: audience.length,
    sample: audience.slice(0, 6).map(toPreviewLead),
  }
}

export async function saveRemarketingCampaign(ownerId: string, input: SaveRemarketingInput) {
  const campaignId = normalizeOptionalUuid(input.campaignId, 'Campanha invalida.')
  const name = normalizeName(input.name)
  const message = normalizeMessage(input.message)
  const filters = normalizeRemarketingFilters(input.filters)
  const audience = await buildAudience(ownerId, filters)
  const now = new Date().toISOString()

  await assertCampaignLimit(ownerId, campaignId)

  if (campaignId) {
    const current = await getCampaign(ownerId, campaignId)
    if (!current) throw new HttpError(404, 'Campanha nao encontrada.')
    const sentCount = await countRecipients(campaignId, 'sent')
    if (sentCount > 0) {
      throw new HttpError(400, 'Campanhas ja enviadas nao podem trocar publico ou mensagem.')
    }

    const { error: updateError } = await serviceSupabase
      .from('remarketing_campaigns')
      .update({
        bot_id: filters.botId,
        flow_id: filters.flowId,
        name,
        message,
        filters,
        audience_count: audience.length,
        sent_count: 0,
        failed_count: 0,
        status: audience.length > 0 ? 'ready' : 'draft',
        last_prepared_at: now,
        completed_at: null,
        started_at: null,
      })
      .eq('id', campaignId)
      .eq('owner_id', ownerId)

    if (updateError) throw updateError

    const { error: deleteError } = await serviceSupabase
      .from('remarketing_campaign_recipients')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('owner_id', ownerId)

    if (deleteError) throw deleteError

    await insertRecipients(ownerId, campaignId, message, audience)
    return getPublicCampaign(ownerId, campaignId)
  }

  const { data, error } = await serviceSupabase
    .from('remarketing_campaigns')
    .insert({
      owner_id: ownerId,
      bot_id: filters.botId,
      flow_id: filters.flowId,
      name,
      message,
      filters,
      audience_count: audience.length,
      status: audience.length > 0 ? 'ready' : 'draft',
      last_prepared_at: now,
    })
    .select('id')
    .single()

  if (error) throw error

  await insertRecipients(ownerId, data.id, message, audience)
  return getPublicCampaign(ownerId, data.id)
}

export async function sendRemarketingBatch(ownerId: string, campaignIdValue: unknown, confirm: unknown) {
  const campaignId = normalizeRequiredUuid(campaignIdValue, 'Campanha invalida.')
  if (confirm !== true) {
    throw new HttpError(400, 'Confirme o envio antes de disparar mensagens.')
  }

  const campaign = await getCampaign(ownerId, campaignId)
  if (!campaign) throw new HttpError(404, 'Campanha nao encontrada.')
  if (campaign.status === 'sent') throw new HttpError(400, 'Campanha ja enviada.')

  const { data: secret, error: secretError } = await serviceSupabase
    .from('bot_secrets')
    .select('telegram_token')
    .eq('bot_id', campaign.bot_id)
    .maybeSingle()

  if (secretError) throw secretError
  if (!secret?.telegram_token) {
    throw new HttpError(400, 'Bot sem token do Telegram. Reconecte o bot antes de enviar.')
  }

  const { data, error } = await serviceSupabase
    .from('remarketing_campaign_recipients')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('campaign_id', campaignId)
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(25)

  if (error) throw error

  const recipients = (data ?? []) as RecipientRow[]
  if (recipients.length === 0) {
    await refreshCampaignCounters(ownerId, campaignId)
    return getPublicCampaign(ownerId, campaignId)
  }

  await serviceSupabase
    .from('remarketing_campaigns')
    .update({
      status: 'sending',
      started_at: campaign.started_at ?? new Date().toISOString(),
    })
    .eq('id', campaignId)
    .eq('owner_id', ownerId)

  for (const recipient of recipients) {
    try {
      await sendMessage(secret.telegram_token, recipient.telegram_chat_id, recipient.rendered_message)
      await serviceSupabase
        .from('remarketing_campaign_recipients')
        .update({
          status: 'sent',
          error_message: null,
          sent_at: new Date().toISOString(),
        })
        .eq('id', recipient.id)
        .eq('owner_id', ownerId)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao enviar mensagem.'
      await serviceSupabase
        .from('remarketing_campaign_recipients')
        .update({
          status: 'failed',
          error_message: message.slice(0, 500),
        })
        .eq('id', recipient.id)
        .eq('owner_id', ownerId)
    }
  }

  await refreshCampaignCounters(ownerId, campaignId)
  return getPublicCampaign(ownerId, campaignId)
}

export function normalizeRemarketingFilters(value: unknown): RemarketingFilters {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'Filtros da campanha invalidos.')
  }

  const raw = value as Record<string, unknown>
  const botId = normalizeRequiredUuid(raw.botId, 'Selecione um bot valido.')
  const flowId = normalizeNullableUuid(raw.flowId)
  const leadStatus = stringFromSet(raw.leadStatus, leadStatuses, 'all')
  const starts = stringFromSet(raw.starts, startFilters, 'all')
  const lastSeen = stringFromSet(raw.lastSeen, lastSeenFilters, 'month')

  return {
    botId,
    flowId,
    leadStatus,
    starts,
    lastSeen,
  }
}

function normalizeName(value: unknown) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (normalized.length < 3) {
    throw new HttpError(400, 'Informe um nome com pelo menos 3 caracteres.')
  }
  return normalized.slice(0, 120)
}

function normalizeMessage(value: unknown) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (normalized.length < 10) {
    throw new HttpError(400, 'Informe uma mensagem com pelo menos 10 caracteres.')
  }
  if (normalized.length > 1200) {
    throw new HttpError(400, 'Mensagem muito longa. Use no maximo 1200 caracteres.')
  }
  return normalized
}

async function buildAudience(ownerId: string, filters: RemarketingFilters): Promise<LeadAudienceRow[]> {
  await assertBotOwnership(ownerId, filters.botId)
  if (filters.flowId) await assertFlowOwnership(ownerId, filters.flowId, filters.botId)

  let query: any = serviceSupabase
    .from('telegram_leads')
    .select('id,bot_id,flow_id,telegram_chat_id,display_name,first_name,last_name,username,status,start_count,last_seen_at,bot:bots(id,name),flow:flows(id,name)')
    .eq('owner_id', ownerId)
    .eq('bot_id', filters.botId)
    .not('telegram_chat_id', 'is', null)
    .neq('status', 'bloqueado')
    .order('last_seen_at', { ascending: false })
    .limit(5000)

  if (filters.flowId) query = query.eq('flow_id', filters.flowId)
  if (filters.leadStatus !== 'all') query = query.eq('status', filters.leadStatus)
  if (filters.starts === 'one') query = query.eq('start_count', 1)
  if (filters.starts === 'twoPlus') query = query.gte('start_count', 2)
  if (filters.starts === 'fivePlus') query = query.gte('start_count', 5)
  if (filters.starts === 'tenPlus') query = query.gte('start_count', 10)

  const range = getLastSeenDateRange(filters.lastSeen)
  if (range) query = query.gte('last_seen_at', range)

  const { data, error } = await query
  if (error) throw error

  return ((data ?? []) as LeadAudienceRow[]).filter((lead) => Boolean(lead.telegram_chat_id))
}

async function insertRecipients(
  ownerId: string,
  campaignId: string,
  template: string,
  audience: LeadAudienceRow[],
) {
  if (audience.length === 0) return

  const rows = audience.map((lead) => ({
    campaign_id: campaignId,
    owner_id: ownerId,
    lead_id: lead.id,
    bot_id: lead.bot_id,
    flow_id: lead.flow_id,
    telegram_chat_id: lead.telegram_chat_id,
    rendered_message: renderRemarketingMessage(template, lead),
    status: 'queued',
  }))

  const { error } = await serviceSupabase
    .from('remarketing_campaign_recipients')
    .insert(rows)

  if (error) throw error
}

function renderRemarketingMessage(template: string, lead: LeadAudienceRow) {
  const leadName = getLeadName(lead)
  return template
    .replace(/\{nome\}/gi, leadName)
    .replace(/\{bot\}/gi, lead.bot?.name ?? 'seu bot')
    .replace(/\{fluxo\}/gi, lead.flow?.name ?? 'seu fluxo')
}

function toPreviewLead(lead: LeadAudienceRow): RemarketingPreviewLead {
  return {
    id: lead.id,
    name: getLeadName(lead),
    botName: lead.bot?.name ?? 'Bot removido',
    flowName: lead.flow?.name ?? null,
    status: lead.status,
    starts: Number(lead.start_count ?? 0),
    lastSeenAt: lead.last_seen_at,
  }
}

function getLeadName(lead: LeadAudienceRow) {
  return (
    lead.display_name ||
    [lead.first_name, lead.last_name].filter(Boolean).join(' ') ||
    lead.username ||
    'lead'
  )
}

async function assertBotOwnership(ownerId: string, botId: string) {
  const { data, error } = await serviceSupabase
    .from('bots')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('id', botId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new HttpError(400, 'Bot selecionado nao pertence a sua conta.')
}

async function assertFlowOwnership(ownerId: string, flowId: string, botId: string) {
  const { data, error } = await serviceSupabase
    .from('flows')
    .select('id,bot_id')
    .eq('owner_id', ownerId)
    .eq('id', flowId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new HttpError(400, 'Fluxo selecionado nao pertence a sua conta.')
  if (data.bot_id && data.bot_id !== botId) {
    throw new HttpError(400, 'Fluxo selecionado nao pertence ao bot escolhido.')
  }
}

async function assertCampaignLimit(ownerId: string, campaignId: string | null) {
  if (campaignId) return
  const { count, error } = await serviceSupabase
    .from('remarketing_campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId)

  if (error) throw error
  if ((count ?? 0) >= maxCampaigns) {
    throw new HttpError(400, 'Limite de 10 campanhas atingido.')
  }
}

async function countRecipients(campaignId: string, status: RemarketingRecipientStatus) {
  const { count, error } = await serviceSupabase
    .from('remarketing_campaign_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', status)

  if (error) throw error
  return count ?? 0
}

async function getCampaign(ownerId: string, campaignId: string) {
  const { data, error } = await serviceSupabase
    .from('remarketing_campaigns')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('id', campaignId)
    .maybeSingle()

  if (error) throw error
  return data as CampaignRow | null
}

async function getPublicCampaign(ownerId: string, campaignId: string) {
  const dashboard = await listRemarketingDashboard(ownerId)
  const campaign = dashboard.campaigns.find((item) => item.id === campaignId)
  if (!campaign) throw new HttpError(404, 'Campanha nao encontrada.')
  return campaign
}

async function listRecipients(ownerId: string, campaignIds: string[]) {
  if (campaignIds.length === 0) return [] as RecipientRow[]

  const { data, error } = await serviceSupabase
    .from('remarketing_campaign_recipients')
    .select('*')
    .eq('owner_id', ownerId)
    .in('campaign_id', campaignIds)

  if (error) throw error
  return (data ?? []) as RecipientRow[]
}

function groupRecipients(recipients: RecipientRow[]) {
  const grouped = new Map<string, RecipientRow[]>()
  for (const recipient of recipients) {
    const current = grouped.get(recipient.campaign_id) ?? []
    current.push(recipient)
    grouped.set(recipient.campaign_id, current)
  }
  return grouped
}

async function getRevenueByCampaign(ownerId: string, recipients: RecipientRow[]) {
  const sentRecipients = recipients.filter((recipient) => recipient.status === 'sent' && recipient.sent_at)
  if (sentRecipients.length === 0) return new Map<string, number>()

  const leadIds = Array.from(new Set(sentRecipients.map((recipient) => recipient.lead_id)))
  const minSentAt = sentRecipients
    .map((recipient) => recipient.sent_at as string)
    .sort((first, second) => first.localeCompare(second))[0]

  const { data, error } = await serviceSupabase
    .from('analytics_revenue_events')
    .select('lead_id,amount_cents,occurred_at')
    .eq('owner_id', ownerId)
    .eq('event_type', 'payment_confirmed')
    .in('lead_id', leadIds)
    .gte('occurred_at', minSentAt)

  if (error) throw error

  const events = (data ?? []) as RevenueRow[]
  const byCampaign = new Map<string, number>()

  for (const recipient of sentRecipients) {
    const sentAt = recipient.sent_at ?? ''
    const amount = events
      .filter((event) => event.lead_id === recipient.lead_id && event.occurred_at >= sentAt)
      .reduce((total, event) => total + Number(event.amount_cents ?? 0), 0)
    byCampaign.set(recipient.campaign_id, (byCampaign.get(recipient.campaign_id) ?? 0) + amount)
  }

  return byCampaign
}

function toPublicCampaign(campaign: CampaignRow, recipients: RecipientRow[], revenueCents: number): PublicRemarketingCampaign {
  const sentCount = recipients.filter((recipient) => recipient.status === 'sent').length
  const failedCount = recipients.filter((recipient) => recipient.status === 'failed').length
  const queuedCount = recipients.filter((recipient) => recipient.status === 'queued').length
  const skippedCount = recipients.filter((recipient) => recipient.status === 'skipped').length

  return {
    id: campaign.id,
    name: campaign.name,
    message: campaign.message,
    status: campaignStatuses.has(campaign.status as RemarketingCampaignStatus)
      ? (campaign.status as RemarketingCampaignStatus)
      : 'failed',
    botId: campaign.bot_id,
    botName: campaign.bot?.name ?? 'Bot removido',
    flowId: campaign.flow_id,
    flowName: campaign.flow?.name ?? null,
    filters: normalizeStoredFilters(campaign.filters, campaign.bot_id, campaign.flow_id),
    audienceCount: Number(campaign.audience_count ?? recipients.length),
    queuedCount,
    sentCount,
    failedCount,
    skippedCount,
    revenueCents,
    lastPreparedAt: campaign.last_prepared_at,
    startedAt: campaign.started_at,
    completedAt: campaign.completed_at,
    createdAt: campaign.created_at,
    updatedAt: campaign.updated_at,
  }
}

async function refreshCampaignCounters(ownerId: string, campaignId: string) {
  const recipients = await listRecipients(ownerId, [campaignId])
  const queued = recipients.filter((recipient) => recipient.status === 'queued').length
  const sent = recipients.filter((recipient) => recipient.status === 'sent').length
  const failed = recipients.filter((recipient) => recipient.status === 'failed').length
  const status: RemarketingCampaignStatus =
    queued > 0 ? 'ready' : sent > 0 ? 'sent' : failed > 0 ? 'failed' : 'draft'

  const { error } = await serviceSupabase
    .from('remarketing_campaigns')
    .update({
      status,
      sent_count: sent,
      failed_count: failed,
      completed_at: queued === 0 ? new Date().toISOString() : null,
    })
    .eq('id', campaignId)
    .eq('owner_id', ownerId)

  if (error) throw error
}

function normalizeStoredFilters(value: unknown, fallbackBotId: string, fallbackFlowId: string | null): RemarketingFilters {
  try {
    return normalizeRemarketingFilters(value)
  } catch {
    return {
      botId: fallbackBotId,
      flowId: fallbackFlowId,
      leadStatus: 'all',
      starts: 'all',
      lastSeen: 'month',
    }
  }
}

function getLastSeenDateRange(range: RemarketingLastSeenFilter) {
  if (range === 'all') return null
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (range === 'today') return start.toISOString()
  if (range === 'week') {
    start.setDate(start.getDate() - 6)
    return start.toISOString()
  }
  start.setDate(start.getDate() - 29)
  return start.toISOString()
}

function normalizeRequiredUuid(value: unknown, message: string) {
  if (typeof value !== 'string' || !uuidPattern.test(value.trim())) {
    throw new HttpError(400, message)
  }
  return value.trim()
}

function normalizeOptionalUuid(value: unknown, message: string) {
  if (value === undefined || value === null || value === '') return null
  return normalizeRequiredUuid(value, message)
}

function normalizeNullableUuid(value: unknown) {
  if (value === undefined || value === null || value === '' || value === 'all') return null
  return normalizeRequiredUuid(value, 'Fluxo invalido.')
}

function stringFromSet<T extends string>(value: unknown, allowed: Set<T>, fallback: T) {
  const normalized = typeof value === 'string' ? value : fallback
  return allowed.has(normalized as T) ? (normalized as T) : fallback
}
