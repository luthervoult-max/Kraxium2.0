export interface RemarketingTemplateLead {
  name?: string | null
  botName?: string | null
  flowName?: string | null
}

export function renderRemarketingTemplate(template: string, lead: RemarketingTemplateLead) {
  const name = normalizeValue(lead.name) || 'lead'
  const bot = normalizeValue(lead.botName) || 'seu bot'
  const flow = normalizeValue(lead.flowName) || 'seu fluxo'

  return template
    .replace(/\{nome\}/gi, name)
    .replace(/\{bot\}/gi, bot)
    .replace(/\{fluxo\}/gi, flow)
}

export function isRemarketingSendable(status: string, queuedCount: number) {
  return queuedCount > 0 && (status === 'ready' || status === 'failed' || status === 'sending')
}

export function getRemarketingStatusLabel(status: string) {
  if (status === 'ready') return 'Pronta'
  if (status === 'sending') return 'Enviando'
  if (status === 'sent') return 'Enviada'
  if (status === 'failed') return 'Com falhas'
  if (status === 'paused') return 'Pausada'
  return 'Rascunho'
}

function normalizeValue(value?: string | null) {
  return typeof value === 'string' ? value.trim() : ''
}
