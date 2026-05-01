import { describe, expect, it } from 'vitest'
import {
  isPixPaymentTerminal,
  normalizePixStatus,
  selectPixGatewayCandidate,
} from './pixPaymentCore'

describe('pixPaymentCore', () => {
  it('normaliza status comuns dos gateways para status internos', () => {
    expect(normalizePixStatus('approved')).toBe('paid')
    expect(normalizePixStatus('waiting_payment')).toBe('pending')
    expect(normalizePixStatus('expired')).toBe('expired')
    expect(normalizePixStatus('rejected')).toBe('failed')
  })

  it('marca apenas status finais como terminais', () => {
    expect(isPixPaymentTerminal('pending')).toBe(false)
    expect(isPixPaymentTerminal('paid')).toBe(true)
    expect(isPixPaymentTerminal('failed')).toBe(true)
  })

  it('prioriza gateway especifico do fluxo e respeita preferencia manual', () => {
    const candidates = [
      {
        id: 'global',
        provider: 'pushinpay',
        status: 'connected',
        scope: 'global',
        flow_ids: [],
        updated_at: '2026-04-29T00:00:00Z',
      },
      {
        id: 'specific',
        provider: 'syncpay',
        status: 'connected',
        scope: 'specific',
        flow_ids: ['flow-1'],
        updated_at: '2026-04-28T00:00:00Z',
      },
    ]

    expect(selectPixGatewayCandidate(candidates, 'flow-1')?.id).toBe('specific')
    expect(selectPixGatewayCandidate(candidates, 'flow-1', 'pushinpay')?.id).toBe('global')
    expect(selectPixGatewayCandidate(candidates, 'flow-1', 'mercado_pago')).toBeNull()
  })
})
