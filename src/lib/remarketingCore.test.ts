import { describe, expect, it } from 'vitest'
import {
  getRemarketingStatusLabel,
  isRemarketingSendable,
  renderRemarketingTemplate,
} from './remarketingCore'

describe('remarketingCore', () => {
  it('renderiza variaveis simples da mensagem', () => {
    expect(
      renderRemarketingTemplate('Oi {nome}, volte no {bot} pelo {fluxo}.', {
        name: 'Maria',
        botName: 'Kraxium Bot',
        flowName: 'Checkout VIP',
      }),
    ).toBe('Oi Maria, volte no Kraxium Bot pelo Checkout VIP.')
  })

  it('mantem envio bloqueado quando nao ha fila', () => {
    expect(isRemarketingSendable('ready', 0)).toBe(false)
    expect(isRemarketingSendable('ready', 3)).toBe(true)
    expect(isRemarketingSendable('sent', 3)).toBe(false)
  })

  it('traduz status para labels curtos', () => {
    expect(getRemarketingStatusLabel('ready')).toBe('Pronta')
    expect(getRemarketingStatusLabel('sent')).toBe('Enviada')
    expect(getRemarketingStatusLabel('unknown')).toBe('Rascunho')
  })
})
