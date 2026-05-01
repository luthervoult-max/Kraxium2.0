import { supabase } from '@/lib/supabase'
import type { WebhookEventDefinition, WebhookEventType } from '@/lib/webhookEvents'

export type WebhookSubscriptionStatus = 'active' | 'paused' | 'error'

export interface WebhookSubscription {
  id: string
  eventType: WebhookEventType
  targetUrl: string
  status: WebhookSubscriptionStatus
  providerHint: string
  lastSentAt: string | null
  lastStatusCode: number | null
  lastError: string | null
  failureCount: number
  createdAt: string
  updatedAt: string
}

export interface WebhookSummary {
  active: number
  configured: number
  available: number
}

export interface WebhooksDashboard {
  events: WebhookEventDefinition[]
  subscriptions: WebhookSubscription[]
  summary: WebhookSummary
}

export interface WebhookDeliveryResult {
  status: 'success' | 'failed'
  statusCode: number | null
  errorMessage: string | null
}

export async function listWebhooksDashboard() {
  return webhookFetch<WebhooksDashboard>('/api/webhooks', { method: 'GET' })
}

export async function saveWebhook(eventType: WebhookEventType, targetUrl: string) {
  const data = await webhookFetch<{ subscription: WebhookSubscription }>('/api/webhooks', {
    method: 'POST',
    body: JSON.stringify({ action: 'save', eventType, targetUrl }),
  })
  return data.subscription
}

export async function pauseWebhook(eventType: WebhookEventType) {
  const data = await webhookFetch<{ subscription: WebhookSubscription }>('/api/webhooks', {
    method: 'POST',
    body: JSON.stringify({ action: 'pause', eventType }),
  })
  return data.subscription
}

export async function resumeWebhook(eventType: WebhookEventType) {
  const data = await webhookFetch<{ subscription: WebhookSubscription }>('/api/webhooks', {
    method: 'POST',
    body: JSON.stringify({ action: 'resume', eventType }),
  })
  return data.subscription
}

export async function deleteWebhook(eventType: WebhookEventType) {
  await webhookFetch<{ ok: true }>('/api/webhooks', {
    method: 'POST',
    body: JSON.stringify({ action: 'delete', eventType }),
  })
}

export async function testWebhook(eventType: WebhookEventType) {
  return webhookFetch<{
    delivery: WebhookDeliveryResult
    subscriptions: WebhookSubscription[]
    summary: WebhookSummary
  }>('/api/webhooks', {
    method: 'POST',
    body: JSON.stringify({ action: 'test', eventType }),
  })
}

async function webhookFetch<T>(path: string, init: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token

  if (!accessToken) {
    throw new Error('Voce precisa estar logado para configurar webhooks.')
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
        : 'Falha ao chamar a API de webhooks.',
    )
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error(
      'API de webhooks indisponível neste ambiente. No preview da Vercel ela fica ativa; localmente use vercel dev para testar salvamento e disparos.',
    )
  }

  return payload as T
}
