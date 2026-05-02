import { supabase } from '@/lib/supabase'

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

export interface MailingCampaign {
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
  lastRunAt: string | null
  nextRunAt: string | null
  latestRun: MailingRun | null
  createdAt: string
  updatedAt: string
}

export interface MailingRun {
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
  campaigns: MailingCampaign[]
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

export interface SaveMailingInput {
  campaignId?: string | null
  name: string
  message: string
  filters: MailingFilters
  buttons: MailingButtonConfig[]
  media: MailingAssetInput
  audio: MailingAssetInput
  scheduleEnabled: boolean
  scheduledAt: string | null
  recurrenceEnabled: boolean
  recurrenceIntervalHours: number
}

export const mailingGroups: Array<{ value: MailingRecipientGroup; label: string }> = [
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

export async function listMailingDashboard(botId?: string | null) {
  const query = botId ? `?botId=${encodeURIComponent(botId)}` : ''
  return mailingFetch<MailingDashboard>(`/api/mailing${query}`, { method: 'GET' })
}

export async function previewMailingAudience(filters: MailingFilters, message: string) {
  return mailingFetch<MailingPreview>('/api/mailing', {
    method: 'POST',
    body: JSON.stringify({ action: 'preview', filters, message }),
  })
}

export async function saveMailingCampaign(input: SaveMailingInput) {
  const data = await mailingFetch<{ campaign: MailingCampaign }>('/api/mailing', {
    method: 'POST',
    body: JSON.stringify({ action: 'save', ...input }),
  })
  return data.campaign
}

export async function sendMailingCampaign(campaignId: string, confirm: boolean) {
  const data = await mailingFetch<{ campaign: MailingCampaign }>('/api/mailing', {
    method: 'POST',
    body: JSON.stringify({ action: 'send', campaignId, confirm }),
  })
  return data.campaign
}

export async function uploadMailingAsset(file: File, kind: 'media' | 'audio') {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    throw new Error('Voce precisa estar logado para enviar arquivos.')
  }

  validateAsset(file, kind)

  const safeName = file.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120)
  const path = `${userData.user.id}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage
    .from('mailing-assets')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (error) throw error

  return {
    path,
    mime: file.type,
    name: file.name,
  } satisfies MailingAssetInput
}

async function mailingFetch<T>(path: string, init: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token

  if (!accessToken) {
    throw new Error('Voce precisa estar logado para usar Mailing.')
  }

  const response = await fetch(path, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
  })

  const payload = (await response.json().catch(() => null)) as { error?: string } | T | null

  if (!response.ok) {
    throw new Error(
      payload && typeof payload === 'object' && 'error' in payload && payload.error
        ? payload.error
        : 'Falha ao chamar a API de Mailing.',
    )
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('API de Mailing indisponivel ou resposta invalida.')
  }

  return payload as T
}

function validateAsset(file: File, kind: 'media' | 'audio') {
  if (kind === 'media') {
    const valid = ['image/png', 'image/jpeg', 'video/mp4'].includes(file.type)
    if (!valid) throw new Error('Midia precisa ser PNG, JPEG, JPG ou MP4.')
    if (file.size > 25 * 1024 * 1024) throw new Error('Midia deve ter no maximo 25MB.')
    return
  }

  if (file.type !== 'audio/ogg') throw new Error('Audio precisa ser OGG.')
  if (file.size > 10 * 1024 * 1024) throw new Error('Audio deve ter no maximo 10MB.')
}
