import { HttpError, requireMethod, readJsonBody, sendError, withCors, type ApiRequest, type ApiResponse } from '../_lib/http.js'
import { requireUser, serviceSupabase } from '../_lib/supabase.js'
import {
  buildCredentialsHint,
  encryptCredentials,
  normalizeCredentials,
  normalizeFlowIds,
  normalizeProvider,
  normalizeScope,
  requireCredentials,
  sanitizePublicConfig,
  toPublicConnection,
  type PaymentGatewayProvider,
  type PaymentGatewayRow,
} from '../_lib/paymentGateways.js'

interface ConnectGatewayBody {
  provider?: unknown
  scope?: unknown
  flowIds?: unknown
  credentials?: unknown
  publicConfig?: unknown
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (withCors(req, res)) return

  try {
    requireMethod(req, 'POST')
    const user = await requireUser(req)
    const body = await readJsonBody<ConnectGatewayBody>(req)

    const provider = normalizeProvider(body.provider)
    const scope = normalizeScope(body.scope)
    const flowIds = normalizeFlowIds(body.flowIds, scope)
    const credentials = normalizeCredentials(body.credentials)
    const existing = await getExistingConnection(user.id, provider)
    const hasNewCredentials = Object.keys(credentials).length > 0

    if (hasNewCredentials || !existing?.credentials_encrypted) {
      requireCredentials(provider, credentials)
    }

    if (flowIds.length > 0) {
      await assertFlowOwnership(user.id, flowIds)
    }

    const credentialsEncrypted = hasNewCredentials
      ? encryptCredentials(credentials)
      : (existing?.credentials_encrypted ?? null)
    const credentialsHint = hasNewCredentials
      ? buildCredentialsHint(credentials)
      : (existing?.credentials_hint ?? null)
    const publicConfig = {
      ...sanitizePublicConfig(body.publicConfig),
      ...(provider === 'stripe'
        ? {
            oauthReady: isStripeOAuthReady(),
            connectionMode: 'connect_oauth',
          }
        : {}),
    }
    const status = getConnectionStatus(provider)
    const now = new Date().toISOString()

    const { data, error } = await serviceSupabase
      .from('payment_gateway_connections')
      .upsert(
        {
          owner_id: user.id,
          provider,
          status,
          scope,
          flow_ids: flowIds,
          public_config: publicConfig,
          credentials_encrypted: credentialsEncrypted,
          credentials_hint: credentialsHint,
          updated_at: now,
        },
        { onConflict: 'owner_id,provider' },
      )
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
      .single()

    if (error) throw error

    res.status(200).json({ connection: toPublicConnection(data as PaymentGatewayRow) })
  } catch (error) {
    sendError(res, error)
  }
}

async function assertFlowOwnership(ownerId: string, flowIds: string[]) {
  const { data, error } = await serviceSupabase
    .from('flows')
    .select('id')
    .eq('owner_id', ownerId)
    .in('id', flowIds)

  if (error) throw error

  const ownedIds = new Set((data ?? []).map((flow) => flow.id))
  const allOwned = flowIds.every((flowId) => ownedIds.has(flowId))

  if (!allOwned) {
    throw new HttpError(400, 'Um ou mais fluxos selecionados nao pertencem a sua conta.')
  }
}

function getConnectionStatus(provider: PaymentGatewayProvider) {
  return provider === 'stripe' ? 'pending_oauth' : 'connected'
}

async function getExistingConnection(ownerId: string, provider: PaymentGatewayProvider) {
  const { data, error } = await serviceSupabase
    .from('payment_gateway_connections')
    .select('credentials_encrypted,credentials_hint')
    .eq('owner_id', ownerId)
    .eq('provider', provider)
    .maybeSingle()

  if (error) throw error
  return data as { credentials_encrypted: string | null; credentials_hint: string | null } | null
}

function isStripeOAuthReady() {
  return Boolean(
    process.env.STRIPE_CONNECT_CLIENT_ID?.trim() &&
      process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_CONNECT_REDIRECT_URL?.trim(),
  )
}
