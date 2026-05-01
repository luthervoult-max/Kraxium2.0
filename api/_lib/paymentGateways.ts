import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { HttpError } from './http.js'

export type PaymentGatewayProvider = 'mercado_pago' | 'stripe' | 'pushinpay' | 'syncpay'
export type PaymentGatewayScope = 'global' | 'specific'
export type PaymentGatewayStatus = 'connected' | 'pending_oauth' | 'error'

export interface PaymentGatewayRow {
  id: string
  owner_id: string
  provider: string
  status: string
  scope: string
  flow_ids: string[]
  public_config: unknown
  credentials_encrypted: string | null
  credentials_hint: string | null
  created_at: string
  updated_at: string
}

export interface PublicPaymentGatewayConnection {
  id: string
  provider: PaymentGatewayProvider
  status: PaymentGatewayStatus
  scope: PaymentGatewayScope
  flowIds: string[]
  publicConfig: Record<string, unknown>
  credentialsHint: string | null
  createdAt: string
  updatedAt: string
}

const providers = new Set<PaymentGatewayProvider>([
  'mercado_pago',
  'stripe',
  'pushinpay',
  'syncpay',
])

const scopes = new Set<PaymentGatewayScope>(['global', 'specific'])
const statuses = new Set<PaymentGatewayStatus>(['connected', 'pending_oauth', 'error'])
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizeProvider(value: unknown): PaymentGatewayProvider {
  if (typeof value !== 'string' || !providers.has(value as PaymentGatewayProvider)) {
    throw new HttpError(400, 'Gateway de pagamento invalido.')
  }

  return value as PaymentGatewayProvider
}

export function normalizeScope(value: unknown): PaymentGatewayScope {
  const normalized = typeof value === 'string' ? value : 'global'
  if (!scopes.has(normalized as PaymentGatewayScope)) {
    throw new HttpError(400, 'Escopo do gateway invalido.')
  }

  return normalized as PaymentGatewayScope
}

export function normalizeFlowIds(value: unknown, scope: PaymentGatewayScope) {
  if (scope === 'global') return []
  if (!Array.isArray(value)) {
    throw new HttpError(400, 'Selecione pelo menos um fluxo para usar escopo especifico.')
  }

  const ids = Array.from(
    new Set(
      value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => uuidPattern.test(item)),
    ),
  )

  if (ids.length === 0) {
    throw new HttpError(400, 'Selecione pelo menos um fluxo valido para o escopo especifico.')
  }

  return ids
}

export function requireCredentials(provider: PaymentGatewayProvider, credentials: Record<string, string>) {
  if (provider === 'stripe') return

  const missing =
    provider === 'mercado_pago'
      ? !credentials.accessToken
      : provider === 'pushinpay'
        ? !credentials.apiKey
        : !credentials.clientId || !credentials.clientSecret

  if (missing) {
    throw new HttpError(400, 'Preencha as credenciais obrigatorias antes de salvar.')
  }
}

export function normalizeCredentials(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, raw]) => [key, typeof raw === 'string' ? raw.trim() : ''])
      .filter(([, raw]) => Boolean(raw)),
  )
}

export function encryptCredentials(credentials: Record<string, string>) {
  if (Object.keys(credentials).length === 0) return null

  const secret = process.env.PAYMENT_CREDENTIAL_ENCRYPTION_KEY?.trim()
  if (!secret) {
    throw new HttpError(
      500,
      'PAYMENT_CREDENTIAL_ENCRYPTION_KEY nao configurada para salvar credenciais.',
    )
  }

  const key = createHash('sha256').update(secret).digest()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(credentials), 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return [iv, authTag, encrypted].map((part) => part.toString('base64url')).join('.')
}

export function decryptCredentials(encrypted: string | null) {
  if (!encrypted) return {}

  const secret = process.env.PAYMENT_CREDENTIAL_ENCRYPTION_KEY?.trim()
  if (!secret) {
    throw new HttpError(
      500,
      'PAYMENT_CREDENTIAL_ENCRYPTION_KEY nao configurada para usar credenciais de pagamento.',
    )
  }

  const [ivValue, authTagValue, encryptedValue] = encrypted.split('.')
  if (!ivValue || !authTagValue || !encryptedValue) {
    throw new HttpError(500, 'Credenciais de pagamento invalidas. Reconecte o gateway.')
  }

  try {
    const key = createHash('sha256').update(secret).digest()
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64url'))
    decipher.setAuthTag(Buffer.from(authTagValue, 'base64url'))

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8')

    const parsed = JSON.parse(decrypted) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Invalid credentials payload')
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(([, value]) => typeof value === 'string'),
    ) as Record<string, string>
  } catch {
    throw new HttpError(500, 'Nao foi possivel descriptografar o gateway. Reconecte as credenciais.')
  }
}

export function buildCredentialsHint(credentials: Record<string, string>) {
  const value =
    credentials.accessToken ??
    credentials.apiKey ??
    credentials.clientSecret ??
    credentials.clientId ??
    Object.values(credentials)[0]

  if (!value) return null

  return `•••• ${value.slice(-4)}`
}

export function sanitizePublicConfig(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const blocked = new Set([
    'accessToken',
    'apiKey',
    'secret',
    'secretKey',
    'clientSecret',
    'token',
    'password',
  ])

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([key, raw]) => {
      if (blocked.has(key)) return false
      return isJsonSafe(raw)
    }),
  )
}

export function toPublicConnection(row: PaymentGatewayRow): PublicPaymentGatewayConnection {
  return {
    id: row.id,
    provider: normalizeProvider(row.provider),
    status: statuses.has(row.status as PaymentGatewayStatus)
      ? (row.status as PaymentGatewayStatus)
      : 'error',
    scope: scopes.has(row.scope as PaymentGatewayScope) ? (row.scope as PaymentGatewayScope) : 'global',
    flowIds: Array.isArray(row.flow_ids) ? row.flow_ids : [],
    publicConfig:
      row.public_config && typeof row.public_config === 'object' && !Array.isArray(row.public_config)
        ? (row.public_config as Record<string, unknown>)
        : {},
    credentialsHint: row.credentials_hint,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function isJsonSafe(value: unknown): boolean {
  if (value === null) return true
  if (['string', 'number', 'boolean'].includes(typeof value)) return true
  if (Array.isArray(value)) return value.every(isJsonSafe)
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).every(isJsonSafe)
  }
  return false
}
