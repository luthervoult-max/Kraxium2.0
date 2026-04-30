import type { Category } from './blocks'

export type BlockConfig = Record<string, unknown>

export interface BlockOutput {
  id: string
  label: string
}

export type BlockFieldKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'switch'
  | 'button-list'
  | 'route-list'
  | 'node-select'

export interface BlockFieldSpec {
  key: string
  label: string
  kind: BlockFieldKind
  placeholder?: string
  required?: boolean
  options?: Array<{ label: string; value: string }>
  suffix?: string
  min?: number
  helper?: string
}

export interface BlockSpec {
  code: string
  title: string
  category: Category
  summary: string
  defaultConfig: BlockConfig
  fields: BlockFieldSpec[]
  outputs: BlockOutput[]
}

const unitOptions = [
  { label: 'seg', value: 'seg' },
  { label: 'min', value: 'min' },
  { label: 'h', value: 'h' },
  { label: 'dias', value: 'dias' },
]

const paymentOutputs = [
  { id: 'paid', label: 'PAGO' },
  { id: 'unpaid', label: 'NAO PAGO' },
]

const offerOutputs = [
  { id: 'accepted', label: 'ACEITOU' },
  { id: 'rejected', label: 'RECUSOU' },
]

const specs: Record<string, BlockSpec> = {
  CV: {
    code: 'CV',
    title: 'Conversao',
    category: 'sistema',
    summary: 'Marca o ponto final de compra, ativacao ou meta concluida.',
    defaultConfig: { label: 'Conversao', note: 'Fim do fluxo concluido.' },
    fields: [
      { key: 'label', label: 'Nome da conversao', kind: 'text', required: true, placeholder: 'Ex: Compra aprovada' },
      { key: 'note', label: 'Observacao interna', kind: 'textarea', placeholder: 'Quando esse ponto deve ser considerado conversao?' },
    ],
    outputs: [],
  },
  MS: {
    code: 'MS',
    title: 'Mensagem',
    category: 'comunicacao',
    summary: 'Envia uma mensagem rica com titulo e corpo.',
    defaultConfig: { headline: 'Mensagem', message: '' },
    fields: [
      { key: 'headline', label: 'Titulo interno', kind: 'text', required: true, placeholder: 'Ex: Boas-vindas' },
      { key: 'message', label: 'Mensagem', kind: 'textarea', required: true, placeholder: 'Digite a mensagem...' },
    ],
    outputs: [{ id: 'next', label: 'NEXT' }],
  },
  TX: {
    code: 'TX',
    title: 'Texto',
    category: 'comunicacao',
    summary: 'Envia uma mensagem simples no chat.',
    defaultConfig: { message: '' },
    fields: [
      { key: 'message', label: 'Texto da mensagem', kind: 'textarea', required: true, placeholder: 'Digite a mensagem...' },
    ],
    outputs: [{ id: 'next', label: 'NEXT' }],
  },
  IM: mediaSpec('IM', 'Imagem', 'Imagem por URL com legenda opcional.'),
  VD: mediaSpec('VD', 'Video', 'Video por URL com legenda opcional.'),
  AU: mediaSpec('AU', 'Audio', 'Audio por URL com legenda opcional.'),
  AR: mediaSpec('AR', 'Arquivo', 'Arquivo ou documento hospedado.'),
  VN: mediaSpec('VN', 'Video Nota', 'Video nota por URL com legenda opcional.'),
  TP: {
    code: 'TP',
    title: 'Digitando',
    category: 'comunicacao',
    summary: 'Simula digitacao antes do proximo bloco.',
    defaultConfig: { text: 'Digitando...', duration: 3, unit: 'seg' },
    fields: [
      { key: 'text', label: 'Texto visual', kind: 'text', required: true, placeholder: 'Digitando...' },
      { key: 'duration', label: 'Duracao', kind: 'number', required: true, min: 1 },
      { key: 'unit', label: 'Unidade', kind: 'select', options: unitOptions },
    ],
    outputs: [{ id: 'next', label: 'NEXT' }],
  },
  BT: {
    code: 'BT',
    title: 'Botoes',
    category: 'comunicacao',
    summary: 'Mostra botoes e cria uma saida para cada escolha.',
    defaultConfig: { message: '', buttons: ['Botao 1', 'Botao 2'] },
    fields: [
      { key: 'message', label: 'Mensagem opcional', kind: 'textarea', placeholder: 'Mensagem antes dos botoes...' },
      { key: 'buttons', label: 'Botoes', kind: 'button-list', required: true },
    ],
    outputs: [],
  },
  IN: {
    code: 'IN',
    title: 'Input do Usuario',
    category: 'comunicacao',
    summary: 'Captura resposta e salva em uma variavel.',
    defaultConfig: { question: '', variable: 'resposta_usuario', expectedType: 'texto', fallback: '' },
    fields: [
      { key: 'question', label: 'Pergunta', kind: 'textarea', required: true, placeholder: 'O que voce quer perguntar?' },
      { key: 'variable', label: 'Salvar em variavel', kind: 'text', required: true, placeholder: 'Ex: telefone' },
      {
        key: 'expectedType',
        label: 'Tipo esperado',
        kind: 'select',
        options: [
          { label: 'Texto', value: 'texto' },
          { label: 'Numero', value: 'numero' },
          { label: 'Email', value: 'email' },
          { label: 'Telefone', value: 'telefone' },
        ],
      },
      { key: 'fallback', label: 'Mensagem de fallback', kind: 'textarea', placeholder: 'Se a resposta vier invalida...' },
    ],
    outputs: [{ id: 'next', label: 'NEXT' }],
  },
  LC: {
    code: 'LC',
    title: 'Localizacao',
    category: 'logica',
    summary: 'Pede localizacao do usuario ou envia um ponto fixo.',
    defaultConfig: { mode: 'ask', locationLabel: '', mapUrl: '' },
    fields: [
      {
        key: 'mode',
        label: 'Modo',
        kind: 'select',
        options: [
          { label: 'Pedir localizacao', value: 'ask' },
          { label: 'Enviar local fixo', value: 'send' },
        ],
      },
      { key: 'locationLabel', label: 'Nome do local', kind: 'text', placeholder: 'Ex: Loja Centro' },
      { key: 'mapUrl', label: 'URL do mapa', kind: 'text', placeholder: 'https://maps.google.com/...' },
    ],
    outputs: [{ id: 'next', label: 'NEXT' }],
  },
  DL: {
    code: 'DL',
    title: 'Atraso',
    category: 'logica',
    summary: 'Espera um tempo fixo antes de continuar.',
    defaultConfig: { duration: 5, unit: 'seg', showTyping: false },
    fields: [
      { key: 'duration', label: 'Tempo', kind: 'number', required: true, min: 1 },
      { key: 'unit', label: 'Unidade', kind: 'select', options: unitOptions },
      { key: 'showTyping', label: 'Mostrar digitando', kind: 'switch' },
    ],
    outputs: [{ id: 'next', label: 'NEXT' }],
  },
  SD: {
    code: 'SD',
    title: 'Smart Delay',
    category: 'logica',
    summary: 'Atraso com humanizacao e janela horaria.',
    defaultConfig: {
      minDelay: 1,
      maxDelay: 5,
      unit: 'seg',
      humanize: true,
      timezone: 'America/Sao_Paulo',
      windowStart: '09:00',
      windowEnd: '18:00',
    },
    fields: [
      { key: 'minDelay', label: 'Minimo', kind: 'number', required: true, min: 1 },
      { key: 'maxDelay', label: 'Maximo', kind: 'number', required: true, min: 1 },
      { key: 'unit', label: 'Unidade', kind: 'select', options: unitOptions },
      { key: 'humanize', label: 'Humanizar envio', kind: 'switch' },
      { key: 'timezone', label: 'Timezone', kind: 'text', placeholder: 'America/Sao_Paulo' },
      { key: 'windowStart', label: 'Janela inicio', kind: 'text', placeholder: '09:00' },
      { key: 'windowEnd', label: 'Janela fim', kind: 'text', placeholder: '18:00' },
    ],
    outputs: [{ id: 'next', label: 'NEXT' }],
  },
  GT: {
    code: 'GT',
    title: 'Gatilho',
    category: 'logica',
    summary: 'Avalia uma condicao e separa o fluxo em SIM ou NAO.',
    defaultConfig: { condition: '', operator: 'equals', value: '', timeout: 60 },
    fields: [
      { key: 'condition', label: 'Se responder', kind: 'text', required: true, placeholder: 'Ex: {{resposta}}' },
      {
        key: 'operator',
        label: 'Operador',
        kind: 'select',
        options: [
          { label: 'igual a', value: 'equals' },
          { label: 'contem', value: 'contains' },
          { label: 'diferente de', value: 'not_equals' },
          { label: 'maior que', value: 'greater_than' },
        ],
      },
      { key: 'value', label: 'Valor esperado', kind: 'text', required: true, placeholder: 'Ex: sim' },
      { key: 'timeout', label: 'Timeout', kind: 'number', min: 1, suffix: 'seg' },
    ],
    outputs: [
      { id: 'yes', label: 'SIM' },
      { id: 'no', label: 'NAO' },
    ],
  },
  RD: {
    code: 'RD',
    title: 'Randomizer',
    category: 'logica',
    summary: 'Divide leads entre caminhos por peso percentual.',
    defaultConfig: { routes: [{ label: 'Caminho 1', weight: 50 }, { label: 'Caminho 2', weight: 50 }] },
    fields: [{ key: 'routes', label: 'Caminhos', kind: 'route-list', required: true }],
    outputs: [],
  },
  GO: {
    code: 'GO',
    title: 'Go To',
    category: 'logica',
    summary: 'Redireciona para outro bloco do canvas.',
    defaultConfig: { targetNodeId: '' },
    fields: [{ key: 'targetNodeId', label: 'Selecionar bloco', kind: 'node-select', required: true }],
    outputs: [{ id: 'next', label: 'NEXT' }],
  },
  PX: paymentSpec('PX', 'Gerar PIX', 'Gera cobranca PIX e separa pagamento confirmado de pendente.'),
  PG: {
    code: 'PG',
    title: 'Gerar Pagamento',
    category: 'pagamento',
    summary: 'Cria uma oferta de pagamento com recorrencia opcional.',
    defaultConfig: { offerName: '', value: 0, currency: 'BRL', recurrence: 'unico', timeout: 30, priceVariation: false },
    fields: [
      { key: 'offerName', label: 'Nome do plano/produto', kind: 'text', required: true, placeholder: 'Ex: Acesso Premium' },
      { key: 'value', label: 'Valor', kind: 'number', required: true, min: 0, suffix: 'R$' },
      { key: 'currency', label: 'Moeda', kind: 'select', options: [{ label: 'BRL', value: 'BRL' }, { label: 'USD', value: 'USD' }] },
      {
        key: 'recurrence',
        label: 'Recorrencia',
        kind: 'select',
        options: [
          { label: 'Unico', value: 'unico' },
          { label: 'Mensal', value: 'mensal' },
          { label: 'Anual', value: 'anual' },
        ],
      },
      { key: 'timeout', label: 'Timeout', kind: 'number', min: 1, suffix: 'min' },
      { key: 'priceVariation', label: 'Variacao de preco', kind: 'switch' },
    ],
    outputs: paymentOutputs,
  },
  OB: offerSpec('OB', 'Order Bump', 'Oferta extra antes/depois do checkout principal.'),
  UP: offerSpec('UP', 'Upsell', 'Oferta de upgrade apos a compra principal.'),
  DS: offerSpec('DS', 'Downsell', 'Oferta alternativa quando o usuario recusa.'),
  EP: {
    code: 'EP',
    title: 'Entrega do Produto',
    category: 'entrega',
    summary: 'Entrega link, acesso ou instrucoes finais ao usuario.',
    defaultConfig: { deliveryTarget: '', productLink: '', finalMessage: '' },
    fields: [
      { key: 'deliveryTarget', label: 'Destino da entrega', kind: 'text', required: true, placeholder: 'Ex: Curso Premium' },
      { key: 'productLink', label: 'Link/descricao do produto', kind: 'text', required: true, placeholder: 'https://...' },
      { key: 'finalMessage', label: 'Mensagem final', kind: 'textarea', placeholder: 'Aqui esta seu acesso...' },
    ],
    outputs: [],
  },
  AG: {
    code: 'AG',
    title: 'Acesso a Grupo',
    category: 'entrega',
    summary: 'Libera convite para grupo ou canal exclusivo.',
    defaultConfig: { groupName: '', inviteLink: '', expiresAfter: 24, removeAfter: false },
    fields: [
      { key: 'groupName', label: 'Grupo/canal', kind: 'text', required: true, placeholder: 'Ex: VIP Telegram' },
      { key: 'inviteLink', label: 'Link ou identificador', kind: 'text', required: true, placeholder: 'https://t.me/...' },
      { key: 'expiresAfter', label: 'Expira em', kind: 'number', min: 1, suffix: 'h' },
      { key: 'removeAfter', label: 'Remover depois', kind: 'switch' },
    ],
    outputs: [],
  },
}

function mediaSpec(code: string, title: string, summary: string): BlockSpec {
  return {
    code,
    title,
    category: 'comunicacao',
    summary,
    defaultConfig: { mediaUrl: '', caption: '' },
    fields: [
      { key: 'mediaUrl', label: 'URL da midia', kind: 'text', required: true, placeholder: 'https://...' },
      { key: 'caption', label: 'Legenda opcional', kind: 'text', placeholder: 'Legenda...' },
    ],
    outputs: [{ id: 'next', label: 'NEXT' }],
  }
}

function paymentSpec(code: string, title: string, summary: string): BlockSpec {
  return {
    code,
    title,
    category: 'pagamento',
    summary,
    defaultConfig: { offerName: '', value: 0, description: '', expiresIn: 30 },
    fields: [
      { key: 'offerName', label: 'Nome da oferta', kind: 'text', required: true, placeholder: 'Ex: Acesso Premium' },
      { key: 'value', label: 'Valor', kind: 'number', required: true, min: 0, suffix: 'R$' },
      { key: 'description', label: 'Descricao', kind: 'textarea', placeholder: 'Detalhes da cobranca...' },
      { key: 'expiresIn', label: 'Expira em', kind: 'number', min: 1, suffix: 'min' },
    ],
    outputs: paymentOutputs,
  }
}

function offerSpec(code: string, title: string, summary: string): BlockSpec {
  return {
    code,
    title,
    category: 'pagamento',
    summary,
    defaultConfig: { offerName: '', price: 0, mediaUrl: '', message: '', allowReject: true, timeout: 5 },
    fields: [
      { key: 'offerName', label: 'Nome da oferta', kind: 'text', required: true, placeholder: 'Ex: VIP Premium' },
      { key: 'price', label: 'Preco', kind: 'number', required: true, min: 0, suffix: 'R$' },
      { key: 'mediaUrl', label: 'Midia opcional', kind: 'text', placeholder: 'https://...' },
      { key: 'message', label: 'Mensagem opcional', kind: 'textarea', placeholder: 'Mensagem da oferta...' },
      { key: 'allowReject', label: 'Mostrar botao de recusar', kind: 'switch' },
      { key: 'timeout', label: 'Tempo para aceitar', kind: 'number', min: 1, suffix: 'min' },
    ],
    outputs: offerOutputs,
  }
}

export function getBlockSpec(code: string) {
  return specs[code]
}

export function getDefaultConfig(code: string): BlockConfig {
  const spec = getBlockSpec(code)
  return spec ? cloneConfig(spec.defaultConfig) : {}
}

export function mergeBlockConfig(code: string, config: unknown): BlockConfig {
  const base = getDefaultConfig(code)
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return base
  }

  return { ...base, ...(config as BlockConfig) }
}

export function getBlockOutputs(code: string, config: BlockConfig = {}): BlockOutput[] {
  if (code === 'BT') {
    return listFromConfig(config.buttons, ['Botao 1']).map((label, index) => ({
      id: `button_${index + 1}`,
      label,
    }))
  }

  if (code === 'RD') {
    const routes = routeListFromConfig(config.routes)
    return routes.map((route, index) => ({
      id: `route_${index + 1}`,
      label: route.label || `Caminho ${index + 1}`,
    }))
  }

  return getBlockSpec(code)?.outputs ?? [{ id: 'next', label: 'NEXT' }]
}

export function getBlockContent(code: string, config: BlockConfig, fallback = '') {
  const value =
    stringValue(config.message) ||
    stringValue(config.question) ||
    stringValue(config.caption) ||
    stringValue(config.description) ||
    stringValue(config.note) ||
    stringValue(config.finalMessage) ||
    stringValue(config.offerName) ||
    stringValue(config.deliveryTarget) ||
    stringValue(config.groupName)

  if (value) return value

  if (code === 'DL') return `Aguardar ${config.duration ?? 5} ${config.unit ?? 'seg'}`
  if (code === 'SD') return `Delay inteligente de ${config.minDelay ?? 1} ate ${config.maxDelay ?? 5} ${config.unit ?? 'seg'}`
  if (code === 'GT') return `Se ${config.condition ?? 'condicao'} ${config.operator ?? 'equals'} ${config.value ?? ''}`
  if (code === 'RD') return `${routeListFromConfig(config.routes).length} caminhos randomizados`
  if (code === 'GO') return `Ir para ${config.targetNodeId || 'bloco selecionado'}`

  return fallback
}

export function getBlockOptions(code: string, config: BlockConfig): string[] {
  if (code === 'BT') return listFromConfig(config.buttons, [])
  if (code === 'RD') return routeListFromConfig(config.routes).map((route) => `${route.label}:${route.weight}`)
  return []
}

export function validateBlockConfig(code: string, config: BlockConfig): string[] {
  const spec = getBlockSpec(code)
  if (!spec) return []

  const issues: string[] = []

  spec.fields.forEach((field) => {
    if (!field.required) return

    const value = config[field.key]
    if (field.kind === 'button-list' && listFromConfig(value, []).length === 0) {
      issues.push(`${field.label} precisa de pelo menos uma opcao.`)
      return
    }

    if (field.kind === 'route-list' && routeListFromConfig(value).length === 0) {
      issues.push(`${field.label} precisa de pelo menos um caminho.`)
      return
    }

    if (field.kind === 'number' && !Number.isFinite(Number(value))) {
      issues.push(`${field.label} precisa ser um numero.`)
      return
    }

    if (field.kind !== 'button-list' && field.kind !== 'route-list' && !String(value ?? '').trim()) {
      issues.push(`${field.label} e obrigatorio.`)
    }
  })

  return issues
}

export function listFromConfig(value: unknown, fallback: string[]) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return fallback
}

export function routeListFromConfig(value: unknown): Array<{ label: string; weight: number }> {
  if (!Array.isArray(value)) {
    return [{ label: 'Caminho 1', weight: 50 }, { label: 'Caminho 2', weight: 50 }]
  }

  return value
    .map((item, index) => {
      const route = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
      return {
        label: String(route.label ?? `Caminho ${index + 1}`),
        weight: Number(route.weight ?? 0),
      }
    })
    .filter((route) => route.label.trim())
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function cloneConfig(config: BlockConfig): BlockConfig {
  return JSON.parse(JSON.stringify(config)) as BlockConfig
}
