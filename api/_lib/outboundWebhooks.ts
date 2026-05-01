import {
  getWebhookEventDefinition,
  isWebhookEventType,
  WEBHOOK_EVENT_CATALOG,
  type WebhookEventSeverity,
  type WebhookEventType,
} from '../../src/lib/webhookEvents.js'
import { HttpError } from './http.js'
import { serviceSupabase } from './supabase.js'

type JsonRecord = Record<string, unknown>

export interface WebhookSubscriptionRow {
  id: string
  owner_id: string
  event_type: WebhookEventType
  target_url: string
  status: 'active' | 'paused' | 'error'
  provider_hint: string
  last_sent_at: string | null
  last_status_code: number | null
  last_error: string | null
  failure_count: number
  created_at: string
  updated_at: string
}

export interface PublicWebhookSubscription {
  id: string
  eventType: WebhookEventType
  targetUrl: string
  status: 'active' | 'paused' | 'error'
  providerHint: string
  lastSentAt: string | null
  lastStatusCode: number | null
  lastError: string | null
  failureCount: number
  createdAt: string
  updatedAt: string
}

export interface WebhookDispatchPayload {
  title?: string
  message?: string
  severity?: WebhookEventSeverity
  data?: JsonRecord
}

export interface WebhookDispatchOptions {
  dedupeKey?: string | null
}

export async function listWebhookSubscriptions(ownerId: string) {
  const { data, error } = await serviceSupabase
    .from('webhook_subscriptions')
    .select(
      'id,owner_id,event_type,target_url,status,provider_hint,last_sent_at,last_status_code,last_error,failure_count,created_at,updated_at',
    )
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })

  if (error) throw formatWebhookTableError(error.message)

  return ((data ?? []) as WebhookSubscriptionRow[]).map(toPublicWebhookSubscription)
}

export async function saveWebhookSubscription({
  ownerId,
  eventType,
  targetUrl,
}: {
  ownerId: string
  eventType: unknown
  targetUrl: unknown
}) {
  if (!isWebhookEventType(eventType)) {
    throw new HttpError(400, 'Evento de webhook invalido.')
  }

  const normalizedUrl = normalizeTargetUrl(targetUrl)
  const now = new Date().toISOString()

  const { data, error } = await serviceSupabase
    .from('webhook_subscriptions')
    .upsert(
      {
        owner_id: ownerId,
        event_type: eventType,
        target_url: normalizedUrl,
        status: 'active',
        provider_hint: detectProviderHint(normalizedUrl),
        last_error: null,
        updated_at: now,
      },
      { onConflict: 'owner_id,event_type' },
    )
    .select(
      'id,owner_id,event_type,target_url,status,provider_hint,last_sent_at,last_status_code,last_error,failure_count,created_at,updated_at',
    )
    .single()

  if (error) throw formatWebhookTableError(error.message)
  return toPublicWebhookSubscription(data as WebhookSubscriptionRow)
}

export async function updateWebhookSubscriptionStatus({
  ownerId,
  eventType,
  status,
}: {
  ownerId: string
  eventType: unknown
  status: 'active' | 'paused'
}) {
  if (!isWebhookEventType(eventType)) {
    throw new HttpError(400, 'Evento de webhook invalido.')
  }

  const { data, error } = await serviceSupabase
    .from('webhook_subscriptions')
    .update(status === 'active' ? { status, last_error: null } : { status })
    .eq('owner_id', ownerId)
    .eq('event_type', eventType)
    .select(
      'id,owner_id,event_type,target_url,status,provider_hint,last_sent_at,last_status_code,last_error,failure_count,created_at,updated_at',
    )
    .maybeSingle()

  if (error) throw formatWebhookTableError(error.message)
  if (!data) throw new HttpError(404, 'Webhook nao encontrado.')

  return toPublicWebhookSubscription(data as WebhookSubscriptionRow)
}

export async function deleteWebhookSubscription(ownerId: string, eventType: unknown) {
  if (!isWebhookEventType(eventType)) {
    throw new HttpError(400, 'Evento de webhook invalido.')
  }

  const { error } = await serviceSupabase
    .from('webhook_subscriptions')
    .delete()
    .eq('owner_id', ownerId)
    .eq('event_type', eventType)

  if (error) throw formatWebhookTableError(error.message)
}

export async function sendWebhookTest(ownerId: string, eventType: unknown) {
  if (!isWebhookEventType(eventType)) {
    throw new HttpError(400, 'Evento de webhook invalido.')
  }

  const { data, error } = await serviceSupabase
    .from('webhook_subscriptions')
    .select(
      'id,owner_id,event_type,target_url,status,provider_hint,last_sent_at,last_status_code,last_error,failure_count,created_at,updated_at',
    )
    .eq('owner_id', ownerId)
    .eq('event_type', eventType)
    .maybeSingle()

  if (error) throw formatWebhookTableError(error.message)
  if (!data) throw new HttpError(404, 'Configure uma URL antes de testar este webhook.')

  const delivery = await sendSubscriptionWebhook(data as WebhookSubscriptionRow, buildWebhookPayload(eventType, {
    title: `Teste: ${getWebhookEventDefinition(eventType).title}`,
    message: 'Este e um disparo de teste da Kraxium para confirmar que sua URL esta recebendo alertas.',
    severity: 'info',
    data: { test: true },
  }))

  return delivery
}

export async function dispatchWebhookEvent(
  ownerId: string,
  eventType: WebhookEventType,
  payload: WebhookDispatchPayload = {},
  options: WebhookDispatchOptions = {},
) {
  try {
    const { data, error } = await serviceSupabase
      .from('webhook_subscriptions')
      .select(
        'id,owner_id,event_type,target_url,status,provider_hint,last_sent_at,last_status_code,last_error,failure_count,created_at,updated_at',
      )
      .eq('owner_id', ownerId)
      .eq('event_type', eventType)
      .eq('status', 'active')

    if (error) {
      console.error('Falha ao carregar webhooks configurados', error)
      return { attempted: 0, delivered: 0, failed: 0 }
    }

    const subscriptions = (data ?? []) as WebhookSubscriptionRow[]
    const body = buildWebhookPayload(eventType, payload)
    let delivered = 0
    let failed = 0

    for (const subscription of subscriptions) {
      const skipped = await wasAlreadyDelivered(subscription.id, eventType, options.dedupeKey)
      if (skipped) continue

      const result = await sendSubscriptionWebhook(subscription, body, options.dedupeKey)
      if (result.status === 'success') delivered += 1
      if (result.status === 'failed') failed += 1
    }

    return { attempted: subscriptions.length, delivered, failed }
  } catch (error) {
    console.error('Falha inesperada ao disparar webhook externo', error)
    return { attempted: 0, delivered: 0, failed: 0 }
  }
}

export async function maybeDispatchGatewayInstability(ownerId: string, provider?: string | null) {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  let query = serviceSupabase
    .from('pix_payment_transactions')
    .select('id,provider,status,created_at')
    .eq('owner_id', ownerId)
    .gte('created_at', tenMinutesAgo)
    .limit(20)

  if (provider) query = query.eq('provider', provider)

  const { data, error } = await query
  if (error) {
    console.error('Falha ao calcular instabilidade do gateway PIX', error)
    return
  }

  const transactions = data ?? []
  const failures = transactions.filter((transaction) =>
    ['failed', 'expired', 'canceled'].includes(String(transaction.status)),
  )

  if (transactions.length < 5 || failures.length / transactions.length < 0.5) return

  await dispatchWebhookEvent(
    ownerId,
    'gateway_pix_unstable',
    {
      title: 'Gateway PIX instavel',
      message: `${failures.length} de ${transactions.length} tentativas recentes falharam. Vale trocar de gateway antes de perder vendas.`,
      severity: 'warning',
      data: {
        provider: provider ?? 'todos',
        attempts: transactions.length,
        failures: failures.length,
        windowMinutes: 10,
      },
    },
    { dedupeKey: `${provider ?? 'all'}:${Math.floor(Date.now() / (10 * 60 * 1000))}` },
  )
}

export function getWebhookCatalog() {
  return WEBHOOK_EVENT_CATALOG
}

function buildWebhookPayload(eventType: WebhookEventType, payload: WebhookDispatchPayload) {
  const definition = getWebhookEventDefinition(eventType)
  return {
    event: eventType,
    title: payload.title ?? definition.title,
    message: payload.message ?? definition.description,
    severity: payload.severity ?? definition.severity,
    occurredAt: new Date().toISOString(),
    source: 'kraxium',
    data: payload.data ?? {},
  }
}

async function sendSubscriptionWebhook(
  subscription: WebhookSubscriptionRow,
  payload: JsonRecord,
  dedupeKey?: string | null,
) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(subscription.target_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kraxium-Webhooks/1.0',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    const status = response.ok ? 'success' : 'failed'
    const errorMessage = response.ok ? null : `Destino retornou HTTP ${response.status}.`
    await recordDelivery(subscription, payload, status, response.status, errorMessage, dedupeKey)
    return { status, statusCode: response.status, errorMessage }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao enviar webhook.'
    await recordDelivery(subscription, payload, 'failed', null, message, dedupeKey)
    return { status: 'failed' as const, statusCode: null, errorMessage: message }
  } finally {
    clearTimeout(timeout)
  }
}

async function recordDelivery(
  subscription: WebhookSubscriptionRow,
  payload: JsonRecord,
  status: 'success' | 'failed' | 'skipped',
  statusCode: number | null,
  errorMessage: string | null,
  dedupeKey?: string | null,
) {
  const now = new Date().toISOString()
  await serviceSupabase.from('webhook_delivery_logs').insert({
    owner_id: subscription.owner_id,
    subscription_id: subscription.id,
    event_type: subscription.event_type,
    dedupe_key: dedupeKey ?? null,
    payload,
    status,
    status_code: statusCode,
    error_message: errorMessage,
  })

  await serviceSupabase
    .from('webhook_subscriptions')
    .update({
      status: status === 'failed' ? 'error' : 'active',
      last_sent_at: now,
      last_status_code: statusCode,
      last_error: errorMessage,
      failure_count: status === 'failed' ? Number(subscription.failure_count ?? 0) + 1 : 0,
    })
    .eq('id', subscription.id)
}

async function wasAlreadyDelivered(
  subscriptionId: string,
  eventType: WebhookEventType,
  dedupeKey?: string | null,
) {
  if (!dedupeKey) return false

  const { data, error } = await serviceSupabase
    .from('webhook_delivery_logs')
    .select('id')
    .eq('subscription_id', subscriptionId)
    .eq('event_type', eventType)
    .eq('dedupe_key', dedupeKey)
    .eq('status', 'success')
    .maybeSingle()

  if (error) {
    console.error('Falha ao checar webhook duplicado', error)
    return false
  }

  return Boolean(data)
}

function normalizeTargetUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, 'Informe a URL HTTPS do webhook.')
  }

  let parsed: URL
  try {
    parsed = new URL(value.trim())
  } catch {
    throw new HttpError(400, 'URL de webhook invalida.')
  }

  if (parsed.protocol !== 'https:') {
    throw new HttpError(400, 'Por seguranca, use apenas URLs HTTPS.')
  }

  if (isBlockedHost(parsed.hostname)) {
    throw new HttpError(400, 'Use uma URL publica segura. Enderecos locais ou privados nao sao permitidos.')
  }

  return parsed.toString()
}

function isBlockedHost(hostname: string) {
  const host = hostname.toLowerCase()
  return (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  )
}

function detectProviderHint(url: string) {
  const host = new URL(url).hostname.toLowerCase()
  if (host.includes('pushcut')) return 'pushcut'
  if (host.includes('make.com')) return 'make'
  if (host.includes('zapier')) return 'zapier'
  if (host.includes('n8n')) return 'n8n'
  return 'generic'
}

function toPublicWebhookSubscription(row: WebhookSubscriptionRow): PublicWebhookSubscription {
  return {
    id: row.id,
    eventType: row.event_type,
    targetUrl: row.target_url,
    status: row.status,
    providerHint: row.provider_hint,
    lastSentAt: row.last_sent_at,
    lastStatusCode: row.last_status_code,
    lastError: row.last_error,
    failureCount: row.failure_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function formatWebhookTableError(message: string) {
  if (
    message.includes('webhook_subscriptions') &&
    (/schema cache/i.test(message) || /could not find the table/i.test(message) || /does not exist/i.test(message))
  ) {
    return new HttpError(
      503,
      'Tabela de Webhooks ainda nao configurada no Supabase. Aplique a migration 20260501000200_create_webhook_subscriptions.sql.',
    )
  }

  return new Error(message)
}
