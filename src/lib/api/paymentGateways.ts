import { supabase } from '@/lib/supabase'

export type PaymentGatewayProvider = 'mercado_pago' | 'stripe' | 'pushinpay' | 'syncpay'
export type PaymentGatewayScope = 'global' | 'specific'
export type PaymentGatewayStatus = 'connected' | 'pending_oauth' | 'error'

export interface PaymentGatewayConnection {
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

export interface ConnectPaymentGatewayInput {
  provider: PaymentGatewayProvider
  scope: PaymentGatewayScope
  flowIds: string[]
  credentials: Record<string, string>
  publicConfig?: Record<string, unknown>
}

export async function listPaymentGatewayConnections() {
  const data = await paymentGatewayFetch<{ connections: PaymentGatewayConnection[] }>(
    '/api/payment-gateways',
    { method: 'GET' },
  )

  return data.connections
}

export async function connectPaymentGateway(input: ConnectPaymentGatewayInput) {
  const data = await paymentGatewayFetch<{ connection: PaymentGatewayConnection }>(
    '/api/payment-gateways',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'connect', ...input }),
    },
  )

  return data.connection
}

export async function disconnectPaymentGateway(provider: PaymentGatewayProvider) {
  await paymentGatewayFetch<{ ok: true }>('/api/payment-gateways', {
    method: 'POST',
    body: JSON.stringify({ action: 'disconnect', provider }),
  })
}

async function paymentGatewayFetch<T>(path: string, init: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token

  if (!accessToken) {
    throw new Error('Voce precisa estar logado para configurar pagamentos.')
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
        : 'Falha ao chamar a API de pagamentos.',
    )
  }

  return payload as T
}
