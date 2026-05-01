export type PixGatewayProvider = 'mercado_pago' | 'pushinpay' | 'syncpay'
export type PixPaymentStatus = 'pending' | 'paid' | 'expired' | 'canceled' | 'failed'

export interface GatewaySelectionCandidate {
  id: string
  provider: string
  status: string
  scope: string
  flow_ids?: string[] | null
  updated_at?: string | null
}

const pixProviders = new Set<PixGatewayProvider>(['mercado_pago', 'pushinpay', 'syncpay'])

const paidStatuses = new Set([
  'paid',
  'approved',
  'completed',
  'confirmed',
  'payment_confirmed',
  'settled',
  'success',
  'succeeded',
  'received',
])

const pendingStatuses = new Set([
  'pending',
  'waiting_payment',
  'waiting',
  'created',
  'new',
  'in_process',
  'processing',
  'authorized',
  'generated',
])

const expiredStatuses = new Set(['expired', 'expiration', 'past_due', 'timeout'])
const canceledStatuses = new Set(['canceled', 'cancelled', 'refunded', 'chargeback'])
const failedStatuses = new Set(['failed', 'rejected', 'denied', 'error', 'invalid'])

export function normalizePixStatus(status: unknown): PixPaymentStatus {
  const normalized = String(status ?? '').trim().toLowerCase()
  if (paidStatuses.has(normalized)) return 'paid'
  if (expiredStatuses.has(normalized)) return 'expired'
  if (canceledStatuses.has(normalized)) return 'canceled'
  if (failedStatuses.has(normalized)) return 'failed'
  if (pendingStatuses.has(normalized)) return 'pending'
  return 'pending'
}

export function isPixPaymentTerminal(status: PixPaymentStatus) {
  return status === 'paid' || status === 'expired' || status === 'canceled' || status === 'failed'
}

export function isPixGatewayProvider(value: unknown): value is PixGatewayProvider {
  return typeof value === 'string' && pixProviders.has(value as PixGatewayProvider)
}

export function selectPixGatewayCandidate<T extends GatewaySelectionCandidate>(
  candidates: T[],
  flowId?: string | null,
  preferredProvider?: string | null,
) {
  const connectedPixGateways = candidates
    .filter((candidate) => candidate.status === 'connected')
    .filter((candidate) => isPixGatewayProvider(candidate.provider))
    .filter((candidate) => {
      if (candidate.scope !== 'specific') return true
      if (!flowId) return false
      return Array.isArray(candidate.flow_ids) && candidate.flow_ids.includes(flowId)
    })
    .sort((first, second) => {
      if (first.scope !== second.scope) return first.scope === 'specific' ? -1 : 1
      return String(second.updated_at ?? '').localeCompare(String(first.updated_at ?? ''))
    })

  if (preferredProvider && preferredProvider !== 'auto') {
    const preferred = connectedPixGateways.find((candidate) => candidate.provider === preferredProvider)
    if (preferred) return preferred
    return null
  }

  return connectedPixGateways[0] ?? null
}
