import { describe, expect, it } from 'vitest'
import {
  getWebhookEventDefinition,
  isWebhookEventType,
  WEBHOOK_EVENT_CATALOG,
} from './webhookEvents'

describe('webhookEvents', () => {
  it('mantem os seis eventos configuraveis da aba Webhooks', () => {
    expect(WEBHOOK_EVENT_CATALOG).toHaveLength(6)
    expect(WEBHOOK_EVENT_CATALOG.map((event) => event.type)).toEqual([
      'pix_generation_error',
      'gateway_pix_unstable',
      'bot_start_error',
      'bot_unstable',
      'transaction_generated',
      'transaction_approved',
    ])
  })

  it('valida somente tipos conhecidos de webhook', () => {
    expect(isWebhookEventType('transaction_generated')).toBe(true)
    expect(isWebhookEventType('unknown_event')).toBe(false)
    expect(getWebhookEventDefinition('transaction_approved').title).toContain('Aprovada')
  })
})
