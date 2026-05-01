export type WebhookEventType =
  | 'pix_generation_error'
  | 'gateway_pix_unstable'
  | 'bot_start_error'
  | 'bot_unstable'
  | 'transaction_generated'
  | 'transaction_approved'

export type WebhookEventSeverity = 'success' | 'info' | 'warning' | 'critical'

export interface WebhookEventDefinition {
  type: WebhookEventType
  title: string
  description: string
  severity: WebhookEventSeverity
  iconKey: 'card' | 'warning' | 'bot' | 'zap' | 'check'
}

export const WEBHOOK_EVENT_CATALOG: WebhookEventDefinition[] = [
  {
    type: 'pix_generation_error',
    title: 'Erro na Geração do PIX',
    description: 'Receba um aviso quando um bloco de pagamento não conseguir criar o PIX.',
    severity: 'critical',
    iconKey: 'card',
  },
  {
    type: 'gateway_pix_unstable',
    title: 'Gateway PIX Instável',
    description: 'Avisa quando as falhas recentes do gateway passam do limite seguro.',
    severity: 'warning',
    iconKey: 'warning',
  },
  {
    type: 'bot_start_error',
    title: 'Erro no Start dos BOTs',
    description: 'Receba uma notificação se o início do bot falhar para o lead.',
    severity: 'critical',
    iconKey: 'bot',
  },
  {
    type: 'bot_unstable',
    title: 'Bot Caiu ou Instável',
    description: 'Avisa quando o webhook do bot registra erro ou queda de execução.',
    severity: 'warning',
    iconKey: 'warning',
  },
  {
    type: 'transaction_generated',
    title: 'Transação Gerada',
    description: 'Receba uma notificação sempre que um PIX for gerado no fluxo.',
    severity: 'info',
    iconKey: 'zap',
  },
  {
    type: 'transaction_approved',
    title: 'Transação Aprovada',
    description: 'Receba uma notificação sempre que um PIX for pago e confirmado.',
    severity: 'success',
    iconKey: 'check',
  },
]

const webhookEventTypes = new Set<WebhookEventType>(
  WEBHOOK_EVENT_CATALOG.map((event) => event.type),
)

export function isWebhookEventType(value: unknown): value is WebhookEventType {
  return typeof value === 'string' && webhookEventTypes.has(value as WebhookEventType)
}

export function getWebhookEventDefinition(type: WebhookEventType) {
  return WEBHOOK_EVENT_CATALOG.find((event) => event.type === type) ?? WEBHOOK_EVENT_CATALOG[0]
}
