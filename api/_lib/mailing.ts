import { randomBytes } from 'node:crypto'
import { HttpError } from './http.js'
import { serviceSupabase } from './supabase.js'
import {
  sendAudio,
  sendMessage,
  sendPhoto,
  sendVideo,
  sendVoice,
  TelegramApiError,
  type InlineKeyboardButton,
} from './telegram.js'

export type MailingCampaignStatus =
  | 'draft'
  | 'ready'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'paused'
  | 'failed'
  | 'canceled'

export type MailingRunStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'canceled'
export type MailingRecipientStatus = 'queued' | 'sent' | 'failed' | 'skipped'
export type MailingRecipientGroup =
  | 'all'
  | 'vip'
  | 'new'
  | 'expired'
  | 'pending'
  | 'downsell'
  | 'upsell'
  | 'mailing'
  | 'recurring'
  | 'packages'
  | 'tg_premium'
  | 'order_bump'

export interface MailingFilters {
  botId: string
  flowId: string | null
  group: MailingRecipientGroup
}

export interface MailingButtonConfig {
  label: string
  url: string
}

export interface MailingAssetInput {
  path: string | null
  mime: string | null
  name: string | null
}

export interface SaveMailingInput {
  campaignId?: unknown
  name?: unknown
  message?: unknown
  filters?: unknown
  buttons?: unknown
  media?: unknown
  audio?: unknown
  scheduleEnabled?: unknown
  scheduledAt?: unknown
  recurrenceEnabled?: unknown
  recurrenceIntervalHours?: unknown
}

export interface PublicMailingCampaign {
  id: string
  name: string
  message: string
  status: MailingCampaignStatus
  botId: string
  botName: string
  filters: MailingFilters
  buttons: MailingButtonConfig[]
  media: MailingAssetInput
  audio: MailingAssetInput
  mediaName: string | null
  audioName: string | null
  scheduleEnabled: boolean
  scheduledAt: string | null
  recurrenceEnabled: boolean
  recurrenceIntervalHours: number
  audienceCount: number
  sentCount: number
  failedCount: number
  skippedCount: number
  clickCount: number
  lastRunAt: string | null
  nextRunAt: string | null
  latestRun: PublicMailingRun | null
  createdAt: string
  updatedAt: string
}

export interface PublicMailingRun {
  id: string
  campaignId: string
  status: MailingRunStatus
  audienceCount: number
  sentCount: number
  failedCount: number
  skippedCount: number
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

export interface MailingGroupCount {
  group: MailingRecipientGroup
  label: string
  count: number
}

export interface MailingDashboard {
  summary: {
    totalCampaigns: number
    configuredCampaigns: number
    sentRuns: number
    messagesSent: number
    failedMessages: number
    availableCampaigns: number
  }
  campaigns: PublicMailingCampaign[]
  groupCounts: MailingGroupCount[]
  selectedBotId: string | null
}

export interface MailingPreviewLead {
  id: string
  name: string
  status: string
  starts: number
  planName: string | null
  city: string | null
}

export interface MailingPreview {
  count: number
  sample: MailingPreviewLead[]
  warnings: string[]
}

interface MailingCampaignRow {
  id: string
  owner_id: string
  bot_id: string
  name: string
  message: string
  recipient_group: string
  filters: unknown
  button_config: unknown
  media_path: string | null
  media_mime: string | null
  media_name: string | null
  audio_path: string | null
  audio_mime: string | null
  audio_name: string | null
  schedule_enabled: boolean
  scheduled_at: string | null
  recurrence_enabled: boolean
  recurrence_interval_hours: number
  status: string
  audience_count: number
  sent_count: number
  failed_count: number
  skipped_count: number
  last_run_at: string | null
  next_run_at: string | null
  created_at: string
  updated_at: string
  bot?: { id: string; name: string } | null
}

interface MailingRunRow {
  id: string
  owner_id: string
  campaign_id: string
  bot_id: string
  status: string
  audience_count: number
  sent_count: number
  failed_count: number
  skipped_count: number
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

interface MailingRecipientRow {
  id: string
  owner_id: string
  campaign_id: string
  run_id: string
  lead_id: string
  bot_id: string
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
  plan_name: string | null
  metadata: unknown
  last_seen_at: string
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const maxCampaigns = 50
const messageLimit = 4096
const cronBatchSize = 50
const minimumCooldownHours = 3

const campaignStatuses = new Set<MailingCampaignStatus>([
  'draft',
  'ready',
  'scheduled',
  'sending',
  'sent',
  'paused',
  'failed',
  'canceled',
])

const recipientGroups: Array<{ value: MailingRecipientGroup; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'vip', label: 'Vips' },
  { value: 'new', label: 'Novos' },
  { value: 'expired', label: 'Expirados' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'downsell', label: 'Downsellers' },
  { value: 'upsell', label: 'Upsellers' },
  { value: 'mailing', label: 'Mailing' },
  { value: 'recurring', label: 'Recorrentes' },
  { value: 'packages', label: 'Pacotes' },
  { value: 'tg_premium', label: 'TG Premium' },
  { value: 'order_bump', label: 'Order Bump' },
]

const recipientGroupValues = new Set<MailingRecipientGroup>(
  recipientGroups.map((item) => item.value),
)

const mediaMimes = new Set(['image/png', 'image/jpeg', 'video/mp4'])
const audioMimes = new Set(['audio/ogg'])

export async function listMailingDashboard(
  ownerId: string,
  botIdValue?: unknown,
): Promise<MailingDashboard> {
  const botId = normalizeNullableUuid(botIdValue)
  if (botId) await assertBotOwnership(ownerId, botId)

  let campaignQuery = serviceSupabase
    .from('mailing_campaigns')
    .select('*, bot:bots(id,name)')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })

  if (botId) campaignQuery = campaignQuery.eq('bot_id', botId)

  const { data, error } = await campaignQuery
  if (error) throw error

  const campaigns = (data ?? []) as MailingCampaignRow[]
  const campaignIds = campaigns.map((campaign) => campaign.id)
  const runs = await listRuns(ownerId, campaignIds)
  const runsByCampaign = groupRuns(runs)
  const clicksByCampaign = await getCampaignClickTotals(campaignIds)
  const publicCampaigns = campaigns.map((campaign) =>
    toPublicCampaign(
      campaign,
      runsByCampaign.get(campaign.id) ?? [],
      clicksByCampaign.get(campaign.id) ?? 0,
    ),
  )
  const groupCounts = botId ? await getGroupCounts(ownerId, botId, null) : emptyGroupCounts()

  return {
    campaigns: publicCampaigns,
    groupCounts,
    selectedBotId: botId,
    summary: {
      totalCampaigns: publicCampaigns.length,
      configuredCampaigns: publicCampaigns.filter((campaign) => campaign.status !== 'draft').length,
      sentRuns: runs.filter((run) => run.status === 'sent').length,
      messagesSent: runs.reduce((total, run) => total + Number(run.sent_count ?? 0), 0),
      failedMessages: runs.reduce((total, run) => total + Number(run.failed_count ?? 0), 0),
      availableCampaigns: Math.max(0, maxCampaigns - publicCampaigns.length),
    },
  }
}

export async function previewMailingAudience(
  ownerId: string,
  rawFilters: unknown,
  rawMessage?: unknown,
): Promise<MailingPreview> {
  const filters = normalizeMailingFilters(rawFilters)
  const audience = await buildAudience(ownerId, filters)
  const message = typeof rawMessage === 'string' ? rawMessage : ''

  return {
    count: audience.length,
    sample: audience.slice(0, 8).map(toPreviewLead),
    warnings: buildVariableWarnings(message, audience),
  }
}

export async function saveMailingCampaign(ownerId: string, input: SaveMailingInput) {
  const campaignId = normalizeOptionalUuid(input.campaignId, 'Mailing invalido.')
  const name = normalizeName(input.name)
  const message = normalizeMessage(input.message)
  const filters = normalizeMailingFilters(input.filters)
  const buttons = normalizeButtons(input.buttons)
  const media = normalizeAsset(input.media, mediaMimes, 'Midia invalida.')
  const audio = normalizeAsset(input.audio, audioMimes, 'Audio invalido.')
  const scheduleEnabled = input.scheduleEnabled === true
  const scheduledAt = normalizeOptionalDate(input.scheduledAt, 'Agendamento invalido.')
  const recurrenceEnabled = input.recurrenceEnabled === true
  const recurrenceIntervalHours = normalizeRecurrenceHours(input.recurrenceIntervalHours, recurrenceEnabled)
  const audience = await buildAudience(ownerId, filters)

  assertAssetPath(ownerId, media.path)
  assertAssetPath(ownerId, audio.path)
  await assertCampaignLimit(ownerId, campaignId)

  const status = getDraftStatus({
    audienceCount: audience.length,
    scheduleEnabled,
    scheduledAt,
  })
  const nextRunAt = status === 'scheduled' ? scheduledAt : null

  const row = {
    owner_id: ownerId,
    bot_id: filters.botId,
    name,
    message,
    recipient_group: filters.group,
    filters,
    button_config: buttons,
    media_path: media.path,
    media_mime: media.mime,
    media_name: media.name,
    audio_path: audio.path,
    audio_mime: audio.mime,
    audio_name: audio.name,
    schedule_enabled: scheduleEnabled,
    scheduled_at: scheduledAt,
    recurrence_enabled: recurrenceEnabled,
    recurrence_interval_hours: recurrenceIntervalHours,
    status,
    audience_count: audience.length,
    next_run_at: nextRunAt,
  }

  if (campaignId) {
    const current = await getCampaign(ownerId, campaignId)
    if (!current) throw new HttpError(404, 'Mailing nao encontrado.')

    const { error } = await serviceSupabase
      .from('mailing_campaigns')
      .update(row)
      .eq('id', campaignId)
      .eq('owner_id', ownerId)

    if (error) throw error
    return getPublicCampaign(ownerId, campaignId)
  }

  const { data, error } = await serviceSupabase
    .from('mailing_campaigns')
    .insert(row)
    .select('id')
    .single()

  if (error) throw error
  return getPublicCampaign(ownerId, data.id)
}

export async function sendMailingBatch(
  ownerId: string,
  campaignIdValue: unknown,
  confirm: unknown,
) {
  if (confirm !== true) {
    throw new HttpError(400, 'Confirme o envio antes de disparar o mailing.')
  }

  const campaignId = normalizeRequiredUuid(campaignIdValue, 'Mailing invalido.')
  return processMailingCampaign(ownerId, campaignId, { enforceCooldown: true, sendBatchSize: 0 })
}

export async function controlMailingCampaign(
  ownerId: string,
  campaignIdValue: unknown,
  action: 'pause' | 'resume' | 'cancel',
) {
  const campaignId = normalizeRequiredUuid(campaignIdValue, 'Mailing invalido.')
  const campaign = await getCampaign(ownerId, campaignId)
  if (!campaign) throw new HttpError(404, 'Mailing nao encontrado.')

  if (action === 'pause') {
    if (campaign.status !== 'sending' && campaign.status !== 'scheduled') {
      throw new HttpError(400, 'So da pra pausar mailings em envio ou agendados.')
    }
    await updateCampaignStatus(ownerId, campaignId, 'paused')
  } else if (action === 'resume') {
    if (campaign.status !== 'paused') {
      throw new HttpError(400, 'So da pra retomar mailings pausados.')
    }
    await updateCampaignStatus(ownerId, campaignId, 'sending')
  } else {
    if (campaign.status === 'canceled' || campaign.status === 'sent') {
      throw new HttpError(400, 'Esse mailing ja foi finalizado.')
    }
    await updateCampaignStatus(ownerId, campaignId, 'canceled')
    await serviceSupabase
      .from('mailing_recipients')
      .update({ status: 'skipped' })
      .eq('owner_id', ownerId)
      .eq('campaign_id', campaignId)
      .eq('status', 'queued')
    await serviceSupabase
      .from('mailing_runs')
      .update({ status: 'canceled', completed_at: new Date().toISOString() })
      .eq('owner_id', ownerId)
      .eq('campaign_id', campaignId)
      .in('status', ['queued', 'sending'])
  }

  return getPublicCampaign(ownerId, campaignId)
}

async function updateCampaignStatus(ownerId: string, campaignId: string, status: MailingCampaignStatus) {
  const { error } = await serviceSupabase
    .from('mailing_campaigns')
    .update({ status })
    .eq('owner_id', ownerId)
    .eq('id', campaignId)
  if (error) throw error
}

export async function dispatchDueMailings() {
  const now = new Date().toISOString()

  const [scheduledResult, sendingResult] = await Promise.all([
    serviceSupabase
      .from('mailing_campaigns')
      .select('id,owner_id')
      .eq('status', 'scheduled')
      .lte('next_run_at', now)
      .limit(10),
    serviceSupabase
      .from('mailing_campaigns')
      .select('id,owner_id')
      .eq('status', 'sending')
      .limit(10),
  ])

  if (scheduledResult.error) throw scheduledResult.error
  if (sendingResult.error) throw sendingResult.error

  const rows = [...(scheduledResult.data ?? []), ...(sendingResult.data ?? [])] as Array<{
    id: string
    owner_id: string
  }>
  const results: Array<{ campaignId: string; ok: boolean; error?: string }> = []

  for (const row of rows) {
    try {
      await processMailingCampaign(row.owner_id, row.id, { enforceCooldown: false, sendBatchSize: cronBatchSize })
      results.push({ campaignId: row.id, ok: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao processar mailing.'
      await serviceSupabase
        .from('mailing_campaigns')
        .update({ status: 'failed' })
        .eq('id', row.id)
        .eq('owner_id', row.owner_id)
      results.push({ campaignId: row.id, ok: false, error: message })
    }
  }

  return { processed: results.length, results }
}

async function processMailingCampaign(
  ownerId: string,
  campaignId: string,
  options: { enforceCooldown: boolean; sendBatchSize: number },
) {
  const campaign = await getCampaign(ownerId, campaignId)
  if (!campaign) throw new HttpError(404, 'Mailing nao encontrado.')
  if (campaign.status === 'paused') throw new HttpError(400, 'Mailing pausado.')
  if (campaign.status === 'canceled') throw new HttpError(400, 'Mailing cancelado.')

  const { data: secret, error: secretError } = await serviceSupabase
    .from('bot_secrets')
    .select('telegram_token')
    .eq('bot_id', campaign.bot_id)
    .maybeSingle()

  if (secretError) throw secretError
  if (!secret?.telegram_token) {
    throw new HttpError(400, 'Bot sem token do Telegram. Reconecte o bot antes de enviar.')
  }

  let run = await getOpenRun(ownerId, campaign.id)
  if (!run) {
    if (options.enforceCooldown) await assertCooldown(ownerId, campaign.bot_id)
    run = await createRun(ownerId, campaign)
  }

  await serviceSupabase
    .from('mailing_campaigns')
    .update({ status: 'sending', last_run_at: new Date().toISOString() })
    .eq('id', campaign.id)
    .eq('owner_id', ownerId)

  if (options.sendBatchSize <= 0) {
    return getPublicCampaign(ownerId, campaign.id)
  }

  const signedAssets = await getSignedAssets(campaign)
  const { data, error } = await serviceSupabase
    .from('mailing_recipients')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('run_id', run.id)
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(options.sendBatchSize)

  if (error) throw error

  const recipients = (data ?? []) as MailingRecipientRow[]
  const buttonsByRecipient = await loadRecipientButtons(recipients.map((recipient) => recipient.id))
  for (const recipient of recipients) {
    try {
      const buttons = buttonsByRecipient.get(recipient.id) ?? []
      await sendMailingRecipient(secret.telegram_token, recipient, campaign, signedAssets, buttons)
      await serviceSupabase
        .from('mailing_recipients')
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
        .from('mailing_recipients')
        .update({
          status: 'failed',
          error_message: message.slice(0, 500),
        })
        .eq('id', recipient.id)
        .eq('owner_id', ownerId)

      if (error instanceof TelegramApiError && error.telegramCode === 403) {
        await serviceSupabase
          .from('telegram_leads')
          .update({ status: 'bloqueado' })
          .eq('id', recipient.lead_id)
          .eq('owner_id', ownerId)
      }
    }
    await sleep(80 + Math.floor(Math.random() * 100))
  }

  await refreshRunCounters(ownerId, campaign.id, run.id)
  return getPublicCampaign(ownerId, campaign.id)
}

async function createRun(ownerId: string, campaign: MailingCampaignRow) {
  const filters = normalizeStoredFilters(campaign)
  const audience = await buildAudience(ownerId, filters)
  if (audience.length === 0) {
    throw new HttpError(400, 'Este mailing nao tem destinatarios ativos para enviar.')
  }

  const { data, error } = await serviceSupabase
    .from('mailing_runs')
    .insert({
      owner_id: ownerId,
      campaign_id: campaign.id,
      bot_id: campaign.bot_id,
      status: 'sending',
      audience_count: audience.length,
      started_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) throw error

  const run = data as MailingRunRow
  const recipients = audience.map((lead) => ({
    owner_id: ownerId,
    campaign_id: campaign.id,
    run_id: run.id,
    lead_id: lead.id,
    bot_id: lead.bot_id,
    telegram_chat_id: lead.telegram_chat_id,
    rendered_message: renderMailingMessage(campaign.message, lead),
    status: 'queued',
  }))

  const { data: insertedRecipients, error: insertError } = await serviceSupabase
    .from('mailing_recipients')
    .insert(recipients)
    .select('id')

  if (insertError) throw insertError

  const buttons = normalizeButtons(campaign.button_config)
  if (buttons.length > 0 && insertedRecipients) {
    const clickRows = (insertedRecipients as Array<{ id: string }>).flatMap((recipient) =>
      buttons.map((button, buttonIndex) => ({
        token: generateClickToken(),
        owner_id: ownerId,
        campaign_id: campaign.id,
        recipient_id: recipient.id,
        button_index: buttonIndex,
        label: button.label,
        destination_url: button.url,
      })),
    )

    for (let i = 0; i < clickRows.length; i += 500) {
      const { error: clickError } = await serviceSupabase
        .from('mailing_link_clicks')
        .insert(clickRows.slice(i, i + 500))
      if (clickError) throw clickError
    }
  }

  return run
}

async function sendMailingRecipient(
  token: string,
  recipient: MailingRecipientRow,
  campaign: MailingCampaignRow,
  assets: { mediaUrl: string | null; audioUrl: string | null },
  buttons: Array<{ label: string; url: string }>,
) {
  const keyboard = buttons.length > 0
    ? buttons.map((button) => [{ text: button.label, url: button.url } satisfies InlineKeyboardButton])
    : undefined

  const chatId = recipient.telegram_chat_id
  const text = recipient.rendered_message
  const mediaUrl = assets.mediaUrl
  const mediaKind: 'image' | 'video' | null = !mediaUrl
    ? null
    : campaign.media_mime?.startsWith('image/')
      ? 'image'
      : campaign.media_mime === 'video/mp4'
        ? 'video'
        : null

  if (mediaUrl && mediaKind && text.length <= 1024) {
    const sendMedia = mediaKind === 'image' ? sendPhoto : sendVideo
    await sendMedia(token, chatId, mediaUrl, text, keyboard)
  } else {
    if (mediaUrl && mediaKind) {
      const sendMedia = mediaKind === 'image' ? sendPhoto : sendVideo
      await sendMedia(token, chatId, mediaUrl)
    }
    await sendMessage(token, chatId, text, keyboard)
  }

  if (assets.audioUrl && campaign.audio_mime === 'audio/ogg') {
    await sendVoice(token, chatId, assets.audioUrl)
  } else if (assets.audioUrl) {
    await sendAudio(token, chatId, assets.audioUrl)
  }
}

async function refreshRunCounters(ownerId: string, campaignId: string, runId: string) {
  const { data, error } = await serviceSupabase
    .from('mailing_recipients')
    .select('status')
    .eq('owner_id', ownerId)
    .eq('run_id', runId)

  if (error) throw error

  const recipients = (data ?? []) as Array<{ status: string }>
  const queued = recipients.filter((recipient) => recipient.status === 'queued').length
  const sent = recipients.filter((recipient) => recipient.status === 'sent').length
  const failed = recipients.filter((recipient) => recipient.status === 'failed').length
  const skipped = recipients.filter((recipient) => recipient.status === 'skipped').length
  const runStatus: MailingRunStatus = queued > 0 ? 'sending' : sent > 0 ? 'sent' : 'failed'
  const completedAt = queued === 0 ? new Date().toISOString() : null

  const { error: runError } = await serviceSupabase
    .from('mailing_runs')
    .update({
      status: runStatus,
      sent_count: sent,
      failed_count: failed,
      skipped_count: skipped,
      completed_at: completedAt,
    })
    .eq('id', runId)
    .eq('owner_id', ownerId)

  if (runError) throw runError

  const campaign = await getCampaign(ownerId, campaignId)
  if (!campaign) return

  const nextRunAt =
    completedAt && campaign.recurrence_enabled
      ? addHours(new Date(), Math.max(minimumCooldownHours, Number(campaign.recurrence_interval_hours || minimumCooldownHours))).toISOString()
      : null

  const campaignStatus: MailingCampaignStatus =
    queued > 0
      ? 'sending'
      : campaign.recurrence_enabled
        ? 'scheduled'
        : sent > 0
          ? 'sent'
          : 'failed'

  const { error: campaignError } = await serviceSupabase
    .from('mailing_campaigns')
    .update({
      status: campaignStatus,
      sent_count: sent,
      failed_count: failed,
      skipped_count: skipped,
      last_run_at: new Date().toISOString(),
      next_run_at: nextRunAt,
    })
    .eq('id', campaignId)
    .eq('owner_id', ownerId)

  if (campaignError) throw campaignError
}

async function buildAudience(ownerId: string, filters: MailingFilters): Promise<LeadAudienceRow[]> {
  await assertBotOwnership(ownerId, filters.botId)
  if (filters.flowId) await assertFlowOwnership(ownerId, filters.flowId, filters.botId)

  let query = serviceSupabase
    .from('telegram_leads')
    .select('id,bot_id,flow_id,telegram_chat_id,display_name,first_name,last_name,username,status,start_count,plan_name,metadata,last_seen_at')
    .eq('owner_id', ownerId)
    .eq('bot_id', filters.botId)
    .not('telegram_chat_id', 'is', null)
    .neq('status', 'bloqueado')
    .order('last_seen_at', { ascending: false })
    .limit(10000)

  if (filters.flowId) query = query.eq('flow_id', filters.flowId)

  const { data, error } = await query
  if (error) throw error

  const leads = ((data ?? []) as LeadAudienceRow[]).filter((lead) => Boolean(lead.telegram_chat_id))
  const sentLeadIds = filters.group === 'mailing' ? await getSentMailingLeadIds(ownerId, filters.botId) : new Set<string>()
  return leads.filter((lead) => leadMatchesGroup(lead, filters.group, sentLeadIds))
}

async function getGroupCounts(ownerId: string, botId: string, flowId: string | null) {
  const { data, error } = await serviceSupabase
    .from('telegram_leads')
    .select('id,bot_id,flow_id,telegram_chat_id,display_name,first_name,last_name,username,status,start_count,plan_name,metadata,last_seen_at')
    .eq('owner_id', ownerId)
    .eq('bot_id', botId)
    .not('telegram_chat_id', 'is', null)
    .neq('status', 'bloqueado')
    .limit(10000)

  if (error) throw error

  const sentLeadIds = await getSentMailingLeadIds(ownerId, botId)
  const leads = ((data ?? []) as LeadAudienceRow[])
    .filter((lead) => Boolean(lead.telegram_chat_id))
    .filter((lead) => !flowId || lead.flow_id === flowId)

  return recipientGroups.map((group) => ({
    group: group.value,
    label: group.label,
    count: leads.filter((lead) => leadMatchesGroup(lead, group.value, sentLeadIds)).length,
  }))
}

function emptyGroupCounts(): MailingGroupCount[] {
  return recipientGroups.map((group) => ({
    group: group.value,
    label: group.label,
    count: 0,
  }))
}

function leadMatchesGroup(
  lead: LeadAudienceRow,
  group: MailingRecipientGroup,
  sentLeadIds: Set<string>,
) {
  const metadata = jsonRecord(lead.metadata)
  const tags = metadataTags(metadata)
  const plan = normalizeText(lead.plan_name)
  const now = Date.now()

  if (group === 'all') return true
  if (group === 'new') return lead.status === 'novo'
  if (group === 'pending') return lead.status === 'pendente'
  if (group === 'mailing') return sentLeadIds.has(lead.id)
  if (group === 'vip') {
    return lead.status === 'pago' || tags.has('vip') || plan.includes('vip') || plan.includes('premium')
  }
  if (group === 'expired') {
    const expiresAt = stringValue(metadata.expires_at) || stringValue(metadata.access_expires_at)
    return booleanValue(metadata.expired) || normalizeText(metadata.access_status).includes('expired') || (expiresAt ? Date.parse(expiresAt) < now : false)
  }
  if (group === 'downsell') return tags.has('downsell') || tags.has('downseller') || plan.includes('downsell')
  if (group === 'upsell') return tags.has('upsell') || tags.has('upseller') || plan.includes('upsell')
  if (group === 'recurring') return tags.has('recurring') || tags.has('recorrente') || plan.includes('recorrente') || plan.includes('mensal')
  if (group === 'packages') return tags.has('package') || tags.has('pacote') || plan.includes('pacote')
  if (group === 'tg_premium') return tags.has('tg_premium') || tags.has('telegram_premium') || plan.includes('tg premium')
  if (group === 'order_bump') return tags.has('order_bump') || tags.has('order bump') || plan.includes('order bump')
  return false
}

function renderMailingMessage(template: string, lead: LeadAudienceRow) {
  const metadata = jsonRecord(lead.metadata)
  const replacements: Record<string, string> = {
    profile_name: getLeadName(lead),
    country: stringValue(metadata.country) || '',
    state: stringValue(metadata.state) || '',
    city: stringValue(metadata.city) || '',
  }

  return template.replace(/\{(profile_name|country|state|city)\}/gi, (_, key: string) => {
    return replacements[key.toLowerCase()] ?? ''
  })
}

function buildVariableWarnings(message: string, audience: LeadAudienceRow[]) {
  const warnings: string[] = []
  const needsLocation = /\{(country|state|city)\}/i.test(message)
  if (!needsLocation) return warnings

  const missing = audience.filter((lead) => {
    const metadata = jsonRecord(lead.metadata)
    return !metadata.country && !metadata.state && !metadata.city
  }).length

  if (missing > 0) {
    warnings.push(`${missing} lead(s) nao possuem cidade/estado/pais capturados.`)
  }

  return warnings
}

async function getSentMailingLeadIds(ownerId: string, botId: string) {
  const { data, error } = await serviceSupabase
    .from('mailing_recipients')
    .select('lead_id')
    .eq('owner_id', ownerId)
    .eq('bot_id', botId)
    .eq('status', 'sent')
    .limit(10000)

  if (error) throw error
  return new Set((data ?? []).map((row: { lead_id: string }) => row.lead_id))
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
    .from('mailing_campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId)

  if (error) throw error
  if ((count ?? 0) >= maxCampaigns) {
    throw new HttpError(400, 'Limite de 50 mailings atingido.')
  }
}

async function assertCooldown(ownerId: string, botId: string) {
  const since = addHours(new Date(), -minimumCooldownHours).toISOString()
  const { data, error } = await serviceSupabase
    .from('mailing_runs')
    .select('created_at')
    .eq('owner_id', ownerId)
    .eq('bot_id', botId)
    .in('status', ['queued', 'sending', 'sent'])
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  const recent = data?.[0] as { created_at: string } | undefined
  if (!recent) return

  const allowedAt = addHours(new Date(recent.created_at), minimumCooldownHours)
  throw new HttpError(
    429,
    `Aguarde ate ${allowedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} para enviar outro mailing deste bot.`,
  )
}

async function getCampaign(ownerId: string, campaignId: string) {
  const { data, error } = await serviceSupabase
    .from('mailing_campaigns')
    .select('*, bot:bots(id,name)')
    .eq('owner_id', ownerId)
    .eq('id', campaignId)
    .maybeSingle()

  if (error) throw error
  return data as MailingCampaignRow | null
}

async function getPublicCampaign(ownerId: string, campaignId: string) {
  const campaign = await getCampaign(ownerId, campaignId)
  if (!campaign) throw new HttpError(404, 'Mailing nao encontrado.')
  const runs = await listRuns(ownerId, [campaignId])
  const clickCount = (await getCampaignClickTotals([campaignId])).get(campaignId) ?? 0
  return toPublicCampaign(campaign, runs, clickCount)
}

async function getCampaignClickTotals(campaignIds: string[]) {
  const totals = new Map<string, number>()
  if (campaignIds.length === 0) return totals
  const { data, error } = await serviceSupabase
    .from('mailing_link_clicks')
    .select('campaign_id, click_count')
    .in('campaign_id', campaignIds)
  if (error) throw error
  for (const row of (data ?? []) as Array<{ campaign_id: string; click_count: number }>) {
    totals.set(row.campaign_id, (totals.get(row.campaign_id) ?? 0) + Number(row.click_count ?? 0))
  }
  return totals
}

async function loadRecipientButtons(recipientIds: string[]) {
  const map = new Map<string, Array<{ label: string; url: string }>>()
  if (recipientIds.length === 0) return map
  const baseUrl = getPublicAppUrl()
  const { data, error } = await serviceSupabase
    .from('mailing_link_clicks')
    .select('recipient_id, button_index, label, token')
    .in('recipient_id', recipientIds)
    .order('button_index', { ascending: true })
  if (error) throw error
  for (const row of (data ?? []) as Array<{
    recipient_id: string
    button_index: number
    label: string
    token: string
  }>) {
    const list = map.get(row.recipient_id) ?? []
    list.push({ label: row.label, url: `${baseUrl}/api/mailing?click=${row.token}` })
    map.set(row.recipient_id, list)
  }
  return map
}

async function getOpenRun(ownerId: string, campaignId: string) {
  const { data, error } = await serviceSupabase
    .from('mailing_runs')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('campaign_id', campaignId)
    .in('status', ['queued', 'sending'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  return (data?.[0] as MailingRunRow | undefined) ?? null
}

async function listRuns(ownerId: string, campaignIds: string[]) {
  if (campaignIds.length === 0) return [] as MailingRunRow[]
  const { data, error } = await serviceSupabase
    .from('mailing_runs')
    .select('*')
    .eq('owner_id', ownerId)
    .in('campaign_id', campaignIds)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as MailingRunRow[]
}

function groupRuns(runs: MailingRunRow[]) {
  const grouped = new Map<string, MailingRunRow[]>()
  for (const run of runs) {
    const current = grouped.get(run.campaign_id) ?? []
    current.push(run)
    grouped.set(run.campaign_id, current)
  }
  return grouped
}

function toPublicCampaign(
  campaign: MailingCampaignRow,
  runs: MailingRunRow[],
  clickCount: number,
): PublicMailingCampaign {
  const latestRun = runs[0] ? toPublicRun(runs[0]) : null
  return {
    id: campaign.id,
    name: campaign.name,
    message: campaign.message,
    status: campaignStatuses.has(campaign.status as MailingCampaignStatus)
      ? (campaign.status as MailingCampaignStatus)
      : 'failed',
    botId: campaign.bot_id,
    botName: campaign.bot?.name ?? 'Bot removido',
    filters: normalizeStoredFilters(campaign),
    buttons: normalizeButtons(campaign.button_config),
    media: {
      path: campaign.media_path,
      mime: campaign.media_mime,
      name: campaign.media_name,
    },
    audio: {
      path: campaign.audio_path,
      mime: campaign.audio_mime,
      name: campaign.audio_name,
    },
    mediaName: campaign.media_name,
    audioName: campaign.audio_name,
    scheduleEnabled: Boolean(campaign.schedule_enabled),
    scheduledAt: campaign.scheduled_at,
    recurrenceEnabled: Boolean(campaign.recurrence_enabled),
    recurrenceIntervalHours: Number(campaign.recurrence_interval_hours ?? 0),
    audienceCount: Number(campaign.audience_count ?? 0),
    sentCount: runs.reduce((total, run) => total + Number(run.sent_count ?? 0), 0),
    failedCount: runs.reduce((total, run) => total + Number(run.failed_count ?? 0), 0),
    skippedCount: runs.reduce((total, run) => total + Number(run.skipped_count ?? 0), 0),
    clickCount,
    lastRunAt: campaign.last_run_at,
    nextRunAt: campaign.next_run_at,
    latestRun,
    createdAt: campaign.created_at,
    updatedAt: campaign.updated_at,
  }
}

function toPublicRun(run: MailingRunRow): PublicMailingRun {
  return {
    id: run.id,
    campaignId: run.campaign_id,
    status: run.status as MailingRunStatus,
    audienceCount: Number(run.audience_count ?? 0),
    sentCount: Number(run.sent_count ?? 0),
    failedCount: Number(run.failed_count ?? 0),
    skippedCount: Number(run.skipped_count ?? 0),
    startedAt: run.started_at,
    completedAt: run.completed_at,
    createdAt: run.created_at,
  }
}

function toPreviewLead(lead: LeadAudienceRow): MailingPreviewLead {
  const metadata = jsonRecord(lead.metadata)
  return {
    id: lead.id,
    name: getLeadName(lead),
    status: lead.status,
    starts: Number(lead.start_count ?? 0),
    planName: lead.plan_name,
    city: stringValue(metadata.city) || null,
  }
}

function getLeadName(lead: LeadAudienceRow) {
  return (
    lead.display_name ||
    [lead.first_name, lead.last_name].filter(Boolean).join(' ') ||
    lead.username ||
    'cliente'
  )
}

function normalizeMailingFilters(value: unknown): MailingFilters {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'Filtros do mailing invalidos.')
  }

  const raw = value as Record<string, unknown>
  const botId = normalizeRequiredUuid(raw.botId, 'Selecione um bot valido.')
  const flowId = normalizeNullableUuid(raw.flowId)
  const group = stringFromSet(raw.group, recipientGroupValues, 'all')
  return { botId, flowId, group }
}

function normalizeStoredFilters(campaign: MailingCampaignRow): MailingFilters {
  try {
    return normalizeMailingFilters(campaign.filters)
  } catch {
    return {
      botId: campaign.bot_id,
      flowId: null,
      group: recipientGroupValues.has(campaign.recipient_group as MailingRecipientGroup)
        ? (campaign.recipient_group as MailingRecipientGroup)
        : 'all',
    }
  }
}

function normalizeName(value: unknown) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (normalized.length < 3) throw new HttpError(400, 'Informe um nome com pelo menos 3 caracteres.')
  return normalized.slice(0, 120)
}

function normalizeMessage(value: unknown) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (normalized.length < 5) throw new HttpError(400, 'Informe uma mensagem com pelo menos 5 caracteres.')
  if (normalized.length > messageLimit) {
    throw new HttpError(400, `Mensagem muito longa. Use no maximo ${messageLimit} caracteres.`)
  }
  return normalized
}

function normalizeButtons(value: unknown): MailingButtonConfig[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new HttpError(400, 'Botoes invalidos.')
  return value.slice(0, 5).map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new HttpError(400, 'Botao invalido.')
    }
    const raw = item as Record<string, unknown>
    const label = typeof raw.label === 'string' ? raw.label.trim().slice(0, 40) : ''
    const url = typeof raw.url === 'string' ? raw.url.trim() : ''
    if (!label) throw new HttpError(400, 'Informe o texto do botao.')
    if (!/^https:\/\/\S+\.\S+/.test(url)) {
      throw new HttpError(400, 'URL do botao precisa comecar com https://.')
    }
    return { label, url }
  })
}

function normalizeAsset(value: unknown, allowed: Set<string>, message: string): MailingAssetInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { path: null, mime: null, name: null }
  }

  const raw = value as Record<string, unknown>
  const path = typeof raw.path === 'string' && raw.path.trim() ? raw.path.trim() : null
  const mime = typeof raw.mime === 'string' && raw.mime.trim() ? raw.mime.trim() : null
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 180) : null

  if (!path && !mime && !name) return { path: null, mime: null, name: null }
  if (!path || !mime || !allowed.has(mime)) throw new HttpError(400, message)
  return { path, mime, name }
}

function normalizeOptionalDate(value: unknown, message: string) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') throw new HttpError(400, message)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new HttpError(400, message)
  return date.toISOString()
}

function normalizeRecurrenceHours(value: unknown, enabled: boolean) {
  if (!enabled) return 0
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < minimumCooldownHours) {
    throw new HttpError(400, 'Recorrencia precisa respeitar intervalo minimo de 3 horas.')
  }
  return Math.min(720, Math.floor(numeric))
}

function getDraftStatus(input: {
  audienceCount: number
  scheduleEnabled: boolean
  scheduledAt: string | null
}): MailingCampaignStatus {
  if (input.scheduleEnabled) {
    if (!input.scheduledAt) throw new HttpError(400, 'Informe a data do agendamento.')
    return 'scheduled'
  }
  return input.audienceCount > 0 ? 'ready' : 'draft'
}

function assertAssetPath(ownerId: string, path: string | null) {
  if (!path) return
  if (!path.startsWith(`${ownerId}/`)) {
    throw new HttpError(400, 'Arquivo enviado nao pertence a sua conta.')
  }
}

async function getSignedAssets(campaign: MailingCampaignRow) {
  const [mediaUrl, audioUrl] = await Promise.all([
    campaign.media_path ? createSignedAssetUrl(campaign.media_path) : Promise.resolve(null),
    campaign.audio_path ? createSignedAssetUrl(campaign.audio_path) : Promise.resolve(null),
  ])
  return { mediaUrl, audioUrl }
}

async function createSignedAssetUrl(path: string) {
  const { data, error } = await serviceSupabase.storage
    .from('mailing-assets')
    .createSignedUrl(path, 60 * 60)

  if (error) throw error
  return data.signedUrl
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function metadataTags(metadata: Record<string, unknown>) {
  const tags = new Set<string>()
  const value = metadata.tags ?? metadata.tag ?? metadata.segment ?? metadata.segments
  if (Array.isArray(value)) {
    for (const item of value) tags.add(normalizeText(item))
  } else if (typeof value === 'string') {
    for (const item of value.split(/[,\s]+/)) tags.add(normalizeText(item))
  }
  return tags
}

function normalizeText(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function booleanValue(value: unknown) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function generateClickToken() {
  return randomBytes(8).toString('hex')
}

function getPublicAppUrl() {
  const explicit = process.env.PUBLIC_APP_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
  throw new HttpError(500, 'PUBLIC_APP_URL nao configurado para gerar links de tracking.')
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
  return normalizeRequiredUuid(value, 'Identificador invalido.')
}

function stringFromSet<T extends string>(value: unknown, allowed: Set<T>, fallback: T) {
  const normalized = typeof value === 'string' ? value : fallback
  return allowed.has(normalized as T) ? (normalized as T) : fallback
}
