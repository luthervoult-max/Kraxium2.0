import { supabase } from '@/lib/supabase'

export type RemarketingCampaignStatus = 'draft' | 'ready' | 'sending' | 'sent' | 'paused' | 'failed'
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

export interface RemarketingCampaign {
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
  campaigns: RemarketingCampaign[]
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

export interface RemarketingPreview {
  count: number
  sample: RemarketingPreviewLead[]
}

export interface SaveRemarketingCampaignInput {
  campaignId?: string | null
  name: string
  message: string
  filters: RemarketingFilters
}

export async function listRemarketingDashboard() {
  return remarketingFetch<RemarketingDashboard>('/api/remarketing', { method: 'GET' })
}

export async function previewRemarketingAudience(filters: RemarketingFilters) {
  return remarketingFetch<RemarketingPreview>('/api/remarketing', {
    method: 'POST',
    body: JSON.stringify({ action: 'preview', filters }),
  })
}

export async function saveRemarketingCampaign(input: SaveRemarketingCampaignInput) {
  const data = await remarketingFetch<{ campaign: RemarketingCampaign }>('/api/remarketing', {
    method: 'POST',
    body: JSON.stringify({ action: 'save', ...input }),
  })
  return data.campaign
}

export async function sendRemarketingCampaign(campaignId: string, confirm: boolean) {
  const data = await remarketingFetch<{ campaign: RemarketingCampaign }>('/api/remarketing', {
    method: 'POST',
    body: JSON.stringify({ action: 'send', campaignId, confirm }),
  })
  return data.campaign
}

async function remarketingFetch<T>(path: string, init: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token

  if (!accessToken) {
    throw new Error('Voce precisa estar logado para usar remarketing.')
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
        : 'Falha ao chamar a API de remarketing.',
    )
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('API de remarketing indisponivel ou resposta invalida.')
  }

  return payload as T
}
