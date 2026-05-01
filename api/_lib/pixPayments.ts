import { randomUUID } from 'node:crypto'
import {
  isPixPaymentTerminal,
  normalizePixStatus,
  selectPixGatewayCandidate,
  type PixGatewayProvider,
  type PixPaymentStatus,
} from '../../src/lib/pixPaymentCore.js'
import { HttpError } from './http.js'
import { dispatchWebhookEvent, maybeDispatchGatewayInstability } from './outboundWebhooks.js'
import { decryptCredentials, type PaymentGatewayRow } from './paymentGateways.js'
import { serviceSupabase } from './supabase.js'

interface PaymentLead {
  id: string
  first_name?: string | null
  last_name?: string | null
  display_name?: string | null
  email?: string | null
  phone?: string | null
  telegram_chat_id?: string | null
  metadata?: Record<string, unknown> | null
}

export interface PixTransactionRow {
  id: string
  owner_id: string
  bot_id: string | null
  flow_id: string | null
  lead_id: string | null
  node_id: string
  node_type: string
  provider: PixGatewayProvider
  provider_payment_id: string | null
  external_reference: string
  amount_cents: number
  currency: string
  status: PixPaymentStatus
  provider_status: string | null
  pix_code: string | null
  qr_code_base64: string | null
  ticket_url: string | null
  plan_name: string | null
  telegram_chat_id: string | null
  expires_at: string | null
  paid_at: string | null
  raw_response: unknown
  created_at: string
  updated_at: string
}

export interface PixChargeInput {
  ownerId: string
  botId: string
  flowId: string | null
  leadId: string
  nodeId: string
  nodeType: 'PX' | 'PG'
  telegramChatId: string
  amountCents: number
  currency: string
  planName: string
  description?: string | null
  expiresInMinutes: number
  preferredProvider?: string | null
  lead: PaymentLead
}

interface ProviderChargeInput extends PixChargeInput {
  provider: PixGatewayProvider
  credentials: Record<string, string>
  externalReference: string
  expiresAt: string
  webhookUrl: string
}

interface ProviderChargeResult {
  providerPaymentId: string | null
  providerStatus: string | null
  status: PixPaymentStatus
  pixCode: string | null
  qrCodeBase64: string | null
  ticketUrl: string | null
  rawResponse: unknown
}

interface PixStatusResult {
  providerStatus: string | null
  status: PixPaymentStatus
  pixCode?: string | null
  qrCodeBase64?: string | null
  ticketUrl?: string | null
  rawResponse: unknown
}

export async function createPixCharge(input: PixChargeInput) {
  if (input.amountCents <= 0) {
    throw new HttpError(400, 'Valor do PIX deve ser maior que zero.')
  }

  if (input.currency !== 'BRL') {
    throw new HttpError(400, 'PIX real esta disponivel apenas em BRL nesta etapa.')
  }

  const connection = await resolvePixGateway(input.ownerId, input.flowId, input.preferredProvider)
  const provider = connection.provider as PixGatewayProvider
  const credentials = decryptCredentials(connection.credentials_encrypted)
  const externalReference = `kx_${randomUUID()}`
  const expiresAt = new Date(
    Date.now() + Math.max(1, input.expiresInMinutes) * 60 * 1000,
  ).toISOString()
  const webhookUrl = buildWebhookUrl(provider)

  const gatewayResult = await createProviderPixCharge({
    ...input,
    provider,
    credentials,
    externalReference,
    expiresAt,
    webhookUrl,
  })

  const { data, error } = await serviceSupabase
    .from('pix_payment_transactions')
    .insert({
      owner_id: input.ownerId,
      bot_id: input.botId,
      flow_id: input.flowId,
      lead_id: input.leadId,
      node_id: input.nodeId,
      node_type: input.nodeType,
      provider,
      provider_payment_id: gatewayResult.providerPaymentId,
      external_reference: externalReference,
      amount_cents: input.amountCents,
      currency: input.currency,
      status: gatewayResult.status,
      provider_status: gatewayResult.providerStatus,
      pix_code: gatewayResult.pixCode,
      qr_code_base64: gatewayResult.qrCodeBase64,
      ticket_url: gatewayResult.ticketUrl,
      plan_name: input.planName,
      telegram_chat_id: input.telegramChatId,
      expires_at: expiresAt,
      raw_response: toJsonSafe(gatewayResult.rawResponse),
    })
    .select('*')
    .single()

  if (error) throw error
  const transaction = data as PixTransactionRow
  await dispatchWebhookEvent(
    input.ownerId,
    'transaction_generated',
    {
      title: 'Transação PIX gerada',
      message: `${transaction.plan_name || 'Oferta'} gerou PIX de ${formatCurrency(transaction.amount_cents, transaction.currency)}.`,
      severity: 'info',
      data: {
        transactionId: transaction.id,
        provider: transaction.provider,
        botId: transaction.bot_id,
        flowId: transaction.flow_id,
        leadId: transaction.lead_id,
        amountCents: transaction.amount_cents,
        currency: transaction.currency,
        planName: transaction.plan_name,
        status: transaction.status,
        expiresAt: transaction.expires_at,
      },
    },
    { dedupeKey: transaction.id },
  )

  return transaction
}

export async function verifyPixTransaction(transactionId: string) {
  const transaction = await loadPixTransaction(transactionId)

  if (transaction.status === 'paid') {
    return { transaction, previousStatus: transaction.status, changed: false }
  }

  if (transaction.status === 'pending' && isLocallyExpired(transaction)) {
    const updated = await updatePixTransactionStatus(transaction, {
      status: 'expired',
      providerStatus: transaction.provider_status ?? 'expired',
      rawResponse: transaction.raw_response,
    })

    return { transaction: updated, previousStatus: transaction.status, changed: true }
  }

  if (isPixPaymentTerminal(transaction.status)) {
    return { transaction, previousStatus: transaction.status, changed: false }
  }

  const connection = await getProviderConnection(transaction.owner_id, transaction.provider)
  const credentials = decryptCredentials(connection.credentials_encrypted)
  const statusResult = await queryProviderPixStatus(transaction, credentials)
  const updated = await updatePixTransactionStatus(transaction, statusResult)

  return {
    transaction: updated,
    previousStatus: transaction.status,
    changed: updated.status !== transaction.status,
  }
}

export async function applyPixWebhook(provider: PixGatewayProvider, payload: unknown) {
  const providerPaymentId = extractProviderPaymentId(provider, payload)
  const externalReference = extractExternalReference(payload)

  const transaction = await findWebhookTransaction(provider, providerPaymentId, externalReference)
  if (!transaction) {
    return { transaction: null, previousStatus: null, changed: false }
  }

  const providerStatus = extractProviderStatus(payload)
  if (!providerStatus) {
    return verifyPixTransaction(transaction.id)
  }

  const status = normalizePixStatus(providerStatus)
  const updated = await updatePixTransactionStatus(transaction, {
    status,
    providerStatus,
    rawResponse: payload,
  })

  return {
    transaction: updated,
    previousStatus: transaction.status,
    changed: updated.status !== transaction.status,
  }
}

export async function loadPixTransaction(transactionId: string) {
  const { data, error } = await serviceSupabase
    .from('pix_payment_transactions')
    .select('*')
    .eq('id', transactionId)
    .single()

  if (error) throw error
  return data as PixTransactionRow
}

async function resolvePixGateway(ownerId: string, flowId: string | null, preferredProvider?: string | null) {
  const { data, error } = await serviceSupabase
    .from('payment_gateway_connections')
    .select(
      `
      id,
      owner_id,
      provider,
      status,
      scope,
      flow_ids,
      public_config,
      credentials_encrypted,
      credentials_hint,
      created_at,
      updated_at
    `,
    )
    .eq('owner_id', ownerId)

  if (error) throw error

  const connection = selectPixGatewayCandidate(
    (data ?? []) as PaymentGatewayRow[],
    flowId,
    preferredProvider,
  )

  if (!connection) {
    throw new HttpError(
      400,
      'Nenhum gateway PIX conectado para este fluxo. Conecte Mercado Pago, PushinPay ou SyncPay na aba Pagamentos.',
    )
  }

  if (!connection.credentials_encrypted) {
    throw new HttpError(400, 'Gateway PIX conectado sem credenciais. Reconecte o gateway em Pagamentos.')
  }

  return connection
}

async function getProviderConnection(ownerId: string, provider: PixGatewayProvider) {
  const { data, error } = await serviceSupabase
    .from('payment_gateway_connections')
    .select(
      `
      id,
      owner_id,
      provider,
      status,
      scope,
      flow_ids,
      public_config,
      credentials_encrypted,
      credentials_hint,
      created_at,
      updated_at
    `,
    )
    .eq('owner_id', ownerId)
    .eq('provider', provider)
    .eq('status', 'connected')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new HttpError(400, 'Gateway PIX desconectado. Reconecte em Pagamentos.')
  if (!data.credentials_encrypted) {
    throw new HttpError(400, 'Gateway PIX sem credenciais. Reconecte em Pagamentos.')
  }

  return data as PaymentGatewayRow
}

async function createProviderPixCharge(input: ProviderChargeInput): Promise<ProviderChargeResult> {
  if (input.provider === 'mercado_pago') return createMercadoPagoPix(input)
  if (input.provider === 'pushinpay') return createPushinPayPix(input)
  return createSyncPayPix(input)
}

async function queryProviderPixStatus(
  transaction: PixTransactionRow,
  credentials: Record<string, string>,
): Promise<PixStatusResult> {
  if (transaction.provider === 'mercado_pago') return queryMercadoPagoPix(transaction, credentials)
  if (transaction.provider === 'pushinpay') return queryPushinPayPix(transaction, credentials)
  return querySyncPayPix(transaction, credentials)
}

async function createMercadoPagoPix(input: ProviderChargeInput): Promise<ProviderChargeResult> {
  const accessToken = input.credentials.accessToken
  if (!accessToken) throw new HttpError(400, 'Access Token do Mercado Pago ausente.')

  const response = await gatewayFetch(`${mercadoPagoBaseUrl()}/v1/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': input.externalReference,
    },
    body: JSON.stringify({
      transaction_amount: centsToMoney(input.amountCents),
      description: input.description || input.planName,
      payment_method_id: 'pix',
      notification_url: input.webhookUrl,
      external_reference: input.externalReference,
      payer: {
        email: getLeadEmail(input.lead),
        first_name: input.lead.first_name ?? input.lead.display_name ?? 'Lead',
        last_name: input.lead.last_name ?? 'Kraxium',
      },
      date_of_expiration: input.expiresAt,
    }),
  })

  const qrData = getObject(response, ['point_of_interaction', 'transaction_data'])
  const providerStatus = getString(response, ['status'])

  return {
    providerPaymentId: stringFromUnknown(getValue(response, ['id'])),
    providerStatus,
    status: normalizePixStatus(providerStatus),
    pixCode: stringFromUnknown(getValue(qrData, ['qr_code'])),
    qrCodeBase64: stringFromUnknown(getValue(qrData, ['qr_code_base64'])),
    ticketUrl: stringFromUnknown(getValue(qrData, ['ticket_url'])),
    rawResponse: response,
  }
}

async function queryMercadoPagoPix(
  transaction: PixTransactionRow,
  credentials: Record<string, string>,
): Promise<PixStatusResult> {
  const accessToken = credentials.accessToken
  if (!accessToken) throw new HttpError(400, 'Access Token do Mercado Pago ausente.')
  if (!transaction.provider_payment_id) {
    return { status: 'pending', providerStatus: null, rawResponse: transaction.raw_response }
  }

  const response = await gatewayFetch(
    `${mercadoPagoBaseUrl()}/v1/payments/${encodeURIComponent(transaction.provider_payment_id)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )
  const qrData = getObject(response, ['point_of_interaction', 'transaction_data'])
  const providerStatus = getString(response, ['status'])

  return {
    providerStatus,
    status: normalizePixStatus(providerStatus),
    pixCode: stringFromUnknown(getValue(qrData, ['qr_code'])),
    qrCodeBase64: stringFromUnknown(getValue(qrData, ['qr_code_base64'])),
    ticketUrl: stringFromUnknown(getValue(qrData, ['ticket_url'])),
    rawResponse: response,
  }
}

async function createPushinPayPix(input: ProviderChargeInput): Promise<ProviderChargeResult> {
  const apiKey = input.credentials.apiKey
  if (!apiKey) throw new HttpError(400, 'API Key da PushinPay ausente.')

  const response = await gatewayFetch(`${pushinPayBaseUrl()}/api/pix/cashIn`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      value: input.amountCents,
      webhook_url: input.webhookUrl,
      external_reference: input.externalReference,
    }),
  })

  const providerStatus = findFirstString(response, ['status', 'payment_status', 'state'])

  return {
    providerPaymentId: findFirstString(response, ['id', 'transaction_id', 'payment_id']),
    providerStatus,
    status: normalizePixStatus(providerStatus),
    pixCode: findFirstString(response, ['qr_code', 'qrcode', 'pix_code', 'copy_paste', 'payload']),
    qrCodeBase64: findFirstString(response, ['qr_code_base64', 'qrcode_base64', 'qr_code_image']),
    ticketUrl: findFirstString(response, ['ticket_url', 'payment_url']),
    rawResponse: response,
  }
}

async function queryPushinPayPix(
  transaction: PixTransactionRow,
  credentials: Record<string, string>,
): Promise<PixStatusResult> {
  const apiKey = credentials.apiKey
  if (!apiKey) throw new HttpError(400, 'API Key da PushinPay ausente.')
  if (!transaction.provider_payment_id) {
    return { status: 'pending', providerStatus: null, rawResponse: transaction.raw_response }
  }

  const response = await gatewayFetch(
    `${pushinPayBaseUrl()}/api/transactions/${encodeURIComponent(transaction.provider_payment_id)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    },
  )
  const providerStatus = findFirstString(response, ['status', 'payment_status', 'state'])

  return {
    providerStatus,
    status: normalizePixStatus(providerStatus),
    pixCode: findFirstString(response, ['qr_code', 'qrcode', 'pix_code', 'copy_paste', 'payload']),
    qrCodeBase64: findFirstString(response, ['qr_code_base64', 'qrcode_base64', 'qr_code_image']),
    ticketUrl: findFirstString(response, ['ticket_url', 'payment_url']),
    rawResponse: response,
  }
}

async function createSyncPayPix(input: ProviderChargeInput): Promise<ProviderChargeResult> {
  const { clientId, clientSecret } = input.credentials
  if (!clientId || !clientSecret) throw new HttpError(400, 'Client ID/Secret da SyncPay ausentes.')

  const customer = getSyncPayCustomer(input.lead)
  const response = await gatewayFetch(`${syncPayBaseUrl()}/api/partner/v1/cash-in`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      amount: centsToMoney(input.amountCents),
      description: input.description || input.planName,
      external_reference: input.externalReference,
      postbackUrl: input.webhookUrl,
      customer,
    }),
  })

  const providerStatus = findFirstString(response, ['status', 'payment_status', 'state'])

  return {
    providerPaymentId: findFirstString(response, [
      'id',
      'transaction_id',
      'idTransaction',
      'id_transaction',
      'payment_id',
    ]),
    providerStatus,
    status: normalizePixStatus(providerStatus),
    pixCode: findFirstString(response, ['qr_code', 'qrcode', 'pix_code', 'copy_paste', 'payload']),
    qrCodeBase64: findFirstString(response, ['qr_code_base64', 'qrcode_base64', 'qr_code_image']),
    ticketUrl: findFirstString(response, ['ticket_url', 'payment_url']),
    rawResponse: response,
  }
}

async function querySyncPayPix(
  transaction: PixTransactionRow,
  credentials: Record<string, string>,
): Promise<PixStatusResult> {
  const { clientId, clientSecret } = credentials
  if (!clientId || !clientSecret) throw new HttpError(400, 'Client ID/Secret da SyncPay ausentes.')
  if (!transaction.provider_payment_id) {
    return { status: 'pending', providerStatus: null, rawResponse: transaction.raw_response }
  }

  const response = await gatewayFetch(
    `${syncPayBaseUrl()}/api/partner/v1/transactions/${encodeURIComponent(
      transaction.provider_payment_id,
    )}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        Accept: 'application/json',
      },
    },
  )
  const providerStatus = findFirstString(response, ['status', 'payment_status', 'state'])

  return {
    providerStatus,
    status: normalizePixStatus(providerStatus),
    pixCode: findFirstString(response, ['qr_code', 'qrcode', 'pix_code', 'copy_paste', 'payload']),
    qrCodeBase64: findFirstString(response, ['qr_code_base64', 'qrcode_base64', 'qr_code_image']),
    ticketUrl: findFirstString(response, ['ticket_url', 'payment_url']),
    rawResponse: response,
  }
}

async function updatePixTransactionStatus(
  transaction: PixTransactionRow,
  result: PixStatusResult,
): Promise<PixTransactionRow> {
  const nextStatus = result.status
  const nextPaidAt =
    nextStatus === 'paid' && transaction.status !== 'paid'
      ? new Date().toISOString()
      : transaction.paid_at

  const { data, error } = await serviceSupabase
    .from('pix_payment_transactions')
    .update({
      status: nextStatus,
      provider_status: result.providerStatus ?? transaction.provider_status,
      pix_code: result.pixCode ?? transaction.pix_code,
      qr_code_base64: result.qrCodeBase64 ?? transaction.qr_code_base64,
      ticket_url: result.ticketUrl ?? transaction.ticket_url,
      raw_response: toJsonSafe(result.rawResponse),
      paid_at: nextPaidAt,
    })
    .eq('id', transaction.id)
    .select('*')
    .single()

  if (error) throw error
  const updated = data as PixTransactionRow

  if (nextStatus === 'paid' && transaction.status !== 'paid') {
    await dispatchWebhookEvent(
      updated.owner_id,
      'transaction_approved',
      {
        title: 'Transação PIX aprovada',
        message: `${updated.plan_name || 'Pagamento'} foi confirmado em ${formatCurrency(updated.amount_cents, updated.currency)}.`,
        severity: 'success',
        data: {
          transactionId: updated.id,
          provider: updated.provider,
          botId: updated.bot_id,
          flowId: updated.flow_id,
          leadId: updated.lead_id,
          amountCents: updated.amount_cents,
          currency: updated.currency,
          planName: updated.plan_name,
          status: updated.status,
          paidAt: updated.paid_at,
        },
      },
      { dedupeKey: updated.id },
    )
  }

  if (['failed', 'expired', 'canceled'].includes(nextStatus)) {
    await maybeDispatchGatewayInstability(updated.owner_id, updated.provider)
  }

  return updated
}

async function findWebhookTransaction(
  provider: PixGatewayProvider,
  providerPaymentId: string | null,
  externalReference: string | null,
) {
  if (externalReference) {
    const { data, error } = await serviceSupabase
      .from('pix_payment_transactions')
      .select('*')
      .eq('external_reference', externalReference)
      .maybeSingle()

    if (error) throw error
    if (data) return data as PixTransactionRow
  }

  if (!providerPaymentId) return null

  const { data, error } = await serviceSupabase
    .from('pix_payment_transactions')
    .select('*')
    .eq('provider', provider)
    .eq('provider_payment_id', providerPaymentId)
    .maybeSingle()

  if (error) throw error
  return (data as PixTransactionRow | null) ?? null
}

function buildWebhookUrl(provider: PixGatewayProvider) {
  const slug = provider === 'mercado_pago' ? 'mercado-pago' : provider
  const rawBaseUrl =
    process.env.PAYMENT_WEBHOOK_BASE_URL ||
    process.env.TELEGRAM_WEBHOOK_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  const baseUrl = rawBaseUrl.trim().replace(/\/$/, '')

  if (!baseUrl) {
    throw new HttpError(
      500,
      'PAYMENT_WEBHOOK_BASE_URL nao configurada para receber confirmacoes de PIX.',
    )
  }

  return `${baseUrl}/api/payment-webhooks/${slug}`
}

async function gatewayFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, init)
  const text = await response.text()
  const payload = parseJson(text)

  if (!response.ok) {
    const message =
      findFirstString(payload, ['message', 'error', 'detail']) ??
      `Gateway retornou HTTP ${response.status}.`
    throw new HttpError(502, `Falha no gateway de pagamento: ${message}`)
  }

  return payload
}

function mercadoPagoBaseUrl() {
  return process.env.MERCADO_PAGO_API_BASE_URL?.replace(/\/$/, '') || 'https://api.mercadopago.com'
}

function pushinPayBaseUrl() {
  return process.env.PUSHINPAY_API_BASE_URL?.replace(/\/$/, '') || 'https://api.pushinpay.com.br'
}

function syncPayBaseUrl() {
  return process.env.SYNCPAY_API_BASE_URL?.replace(/\/$/, '') || 'https://api.syncpayments.com.br'
}

function centsToMoney(cents: number) {
  return Number((cents / 100).toFixed(2))
}

function formatCurrency(cents: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

function getLeadEmail(lead: PaymentLead) {
  const metadata = lead.metadata ?? {}
  const email = lead.email ?? stringFromUnknown(metadata.email) ?? stringFromUnknown(metadata.customerEmail)
  return email || `lead-${lead.id}@kraxium.local`
}

function getSyncPayCustomer(lead: PaymentLead) {
  const metadata = lead.metadata ?? {}
  const cpf =
    stringFromUnknown(metadata.cpf) ??
    stringFromUnknown(metadata.document) ??
    stringFromUnknown(metadata.documento)

  if (!cpf) {
    throw new HttpError(
      400,
      'SyncPay exige CPF/documento do lead. Capture esse dado antes do bloco PIX ou use outro gateway PIX.',
    )
  }

  return {
    name: lead.display_name ?? ([lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Lead Kraxium'),
    email: getLeadEmail(lead),
    phone: lead.phone ?? stringFromUnknown(metadata.phone) ?? stringFromUnknown(metadata.telefone),
    document: cpf,
  }
}

function extractProviderPaymentId(provider: PixGatewayProvider, payload: unknown) {
  if (provider === 'mercado_pago') {
    return (
      stringFromUnknown(getValue(payload, ['data', 'id'])) ??
      stringFromUnknown(getValue(payload, ['resource']))?.split('/').pop() ??
      findFirstString(payload, ['id', 'payment_id'])
    )
  }

  return findFirstString(payload, [
    'id',
    'transaction_id',
    'idTransaction',
    'id_transaction',
    'payment_id',
  ])
}

function extractProviderStatus(payload: unknown) {
  return findFirstString(payload, ['status', 'payment_status', 'state', 'event_status'])
}

function extractExternalReference(payload: unknown) {
  return findFirstString(payload, [
    'external_reference',
    'externalReference',
    'reference',
    'reference_id',
    'transaction_reference',
  ])
}

function isLocallyExpired(transaction: PixTransactionRow) {
  if (!transaction.expires_at) return false
  return new Date(transaction.expires_at).getTime() <= Date.now()
}

function parseJson(text: string) {
  if (!text.trim()) return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    return { message: text.slice(0, 300) }
  }
}

function getObject(value: unknown, path: string[]) {
  const nested = getValue(value, path)
  return nested && typeof nested === 'object' ? nested : null
}

function getString(value: unknown, path: string[]) {
  return stringFromUnknown(getValue(value, path))
}

function getValue(value: unknown, path: string[]): unknown {
  let current = value
  for (const key of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

function findFirstString(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== 'object') return null

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findFirstString(item, keys)
      if (nested) return nested
    }
    return null
  }

  const record = value as Record<string, unknown>
  for (const key of keys) {
    const direct = stringFromUnknown(record[key])
    if (direct) return direct
  }

  for (const nested of Object.values(record)) {
    const found = findFirstString(nested, keys)
    if (found) return found
  }

  return null
}

function stringFromUnknown(value: unknown) {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

function toJsonSafe(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? {})) as unknown
}
