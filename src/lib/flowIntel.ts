import { blocks, type Category } from '@/lib/blocks'

type UnknownRecord = Record<string, unknown>

const MESSAGE_NODE_TYPES = new Set(['MS', 'TX', 'BT', 'IN'])
const PAUSE_NODE_TYPES = new Set(['DL', 'SD'])
const PAYMENT_NODE_TYPES = new Set(['PX', 'PG', 'OB', 'UP', 'DS'])
const DELIVERY_NODE_TYPES = new Set(['EP', 'AG'])
const CTA_PATTERN =
  /\b(clique|toque|responda|responde|escolha|veja|quero|continuar|continuar agora|avancar|prosseguir|entrar|confirmar)\b/i

const BLOCK_CODE_MAP = new Map(
  blocks.map((block) => [block.code, block]),
)

const TYPE_ALIASES = new Map<string, string>([
  ['TR', 'TR'],
  ['DISPARO', 'TR'],
  ['CV', 'CV'],
  ['CONVERSAO', 'CV'],
  ['MS', 'MS'],
  ['MENSAGEM', 'MS'],
  ['TX', 'TX'],
  ['TEXTO', 'TX'],
  ['IM', 'IM'],
  ['IMAGEM', 'IM'],
  ['VD', 'VD'],
  ['VIDEO', 'VD'],
  ['AU', 'AU'],
  ['AUDIO', 'AU'],
  ['AR', 'AR'],
  ['ARQUIVO', 'AR'],
  ['VN', 'VN'],
  ['VIDEO NOTA', 'VN'],
  ['VIDEO-NOTA', 'VN'],
  ['TP', 'TP'],
  ['DIGITANDO', 'TP'],
  ['BT', 'BT'],
  ['BOTOES', 'BT'],
  ['IN', 'IN'],
  ['INPUT DO USUARIO', 'IN'],
  ['INPUT-USUARIO', 'IN'],
  ['LC', 'LC'],
  ['LOCALIZACAO', 'LC'],
  ['DL', 'DL'],
  ['ATRASO', 'DL'],
  ['SD', 'SD'],
  ['SMART DELAY', 'SD'],
  ['SMART-DELAY', 'SD'],
  ['GT', 'GT'],
  ['GATILHO', 'GT'],
  ['RD', 'RD'],
  ['RANDOMIZER', 'RD'],
  ['GO', 'GO'],
  ['GO TO', 'GO'],
  ['GO-TO', 'GO'],
  ['PX', 'PX'],
  ['PIX', 'PX'],
  ['GERAR PIX', 'PX'],
  ['PG', 'PG'],
  ['GERAR PAGAMENTO', 'PG'],
  ['OB', 'OB'],
  ['ORDER BUMP', 'OB'],
  ['UP', 'UP'],
  ['UPSELL', 'UP'],
  ['DS', 'DS'],
  ['DOWNSELL', 'DS'],
  ['EP', 'EP'],
  ['ENTREGA DO PRODUTO', 'EP'],
  ['AG', 'AG'],
  ['ACESSO A GRUPO', 'AG'],
])

const INTENT_BUCKETS = [
  {
    id: 'preco',
    label: 'Duvidas sobre preco',
    regex: /\b(preco|valor|custa|investimento|quanto)\b/i,
    suggestedNodeType: 'BT',
    exampleImplementation:
      'Adicionar um BT apos a oferta com opcoes "Ver preco", "Condicoes de pagamento" e "Continuar".',
    supportRegex: /\b(preco|valor|investimento|parcel|pix|cartao|checkout|pagamento)\b/i,
  },
  {
    id: 'garantia',
    label: 'Duvidas sobre garantia',
    regex: /\b(garantia|reembolso|devolucao|risco)\b/i,
    suggestedNodeType: 'MS',
    exampleImplementation:
      'Adicionar um MS curto explicando garantia e reduzir risco antes do fechamento.',
    supportRegex: /\b(garantia|reembolso|devolucao|risco)\b/i,
  },
  {
    id: 'como_funciona',
    label: 'Duvidas sobre como funciona',
    regex: /\b(como funciona|como que funciona|funciona mesmo|passo a passo|explica)\b/i,
    suggestedNodeType: 'MS',
    exampleImplementation:
      'Adicionar um MS com explicacao objetiva do processo e CTA para a proxima etapa.',
    supportRegex: /\b(como funciona|passo a passo|explico|explicacao|metodo)\b/i,
  },
  {
    id: 'pagamento',
    label: 'Duvidas sobre pagamento',
    regex: /\b(cartao|parcel|pix|boleto|pagamento)\b/i,
    suggestedNodeType: 'BT',
    exampleImplementation:
      'Adicionar um BT com opcoes de pagamento e uma saida especifica para cada condicao.',
    supportRegex: /\b(cartao|parcel|pix|boleto|pagamento|checkout)\b/i,
  },
  {
    id: 'acesso',
    label: 'Duvidas sobre acesso e entrega',
    regex: /\b(acesso|grupo|entra|recebo|entrega|link)\b/i,
    suggestedNodeType: 'TX',
    exampleImplementation:
      'Adicionar um TX ou MS explicando como o acesso e entregue apos o pagamento.',
    supportRegex: /\b(acesso|grupo|entrega|link|recebe|recebera)\b/i,
  },
  {
    id: 'suporte',
    label: 'Pedido por humano ou suporte',
    regex: /\b(humano|atendente|suporte|consultor|pessoa|falar com alguem)\b/i,
    suggestedNodeType: 'IN',
    exampleImplementation:
      'Adicionar um IN para captar o contexto do pedido e encaminhar para suporte humano.',
    supportRegex: /\b(humano|atendente|suporte|consultor|especialista)\b/i,
  },
] as const

export interface ParsedFlowNode {
  id: string
  type: string
  label: string
  text: string
  options: string[]
  category: Category
  position?: {
    x: number
    y: number
  }
}

export interface ParsedFlowEdge {
  id: string
  source: string
  target: string
}

export interface ParsedFlow {
  nodes: ParsedFlowNode[]
  edges: ParsedFlowEdge[]
}

export interface ParsedLogEntry {
  sessionId: string
  event: string
  message: string
  nodeId?: string
  timestamp: string
  sortKey: number
  rawIndex: number
}

export interface FlowPreviewNode {
  id: string
  type: 'flowNode'
  position: {
    x: number
    y: number
  }
  data: {
    code: string
    category: Category
    title: string
    description: string
    text: string
    options: string[]
  }
}

export interface FlowPreviewEdge {
  id: string
  source: string
  target: string
  type: 'smoothstep'
  animated: boolean
  style: {
    stroke: string
    strokeWidth: number
    opacity: number
  }
}

export interface ParseResult<T> {
  data: T | null
  errors: string[]
  counts: {
    nodes?: number
    edges?: number
    logs?: number
  }
}

export interface AnalysisResult {
  bottlenecks: Array<{
    nodeId: string
    nodeType: string
    nodeLabel: string
    dropRate: number
    suggestion: string
  }>
  messageEvaluations: Array<{
    nodeId: string
    currentText: string
    score: number
    improvedText: string
  }>
  unmappedIntents: Array<{
    intent: string
    frequency: number
    suggestedNodeType: string
    exampleImplementation: string
  }>
  structuralOptimizations: Array<{
    issue: string
    nodeIds: string[]
    recommendation: string
  }>
  expansionSuggestions: string[]
}

export interface FlowIntelReport {
  flow: ParsedFlow
  logs: ParsedLogEntry[]
  result: AnalysisResult
}

const exampleFlowObject = {
  nodes: [
    { id: 'tr_start', data: { code: 'TR', title: 'Disparo /start', body: 'Entrada principal pelo comando /start.' } },
    {
      id: 'ms_invite',
      data: {
        code: 'MS',
        title: 'Convite inicial',
        body: 'Tenho um metodo para aumentar suas vendas no Telegram. Quer ver como funciona? Quer saber quanto custa?',
      },
    },
    {
      id: 'tx_benefits',
      code: 'TX',
      label: 'Beneficios',
      content: 'A estrategia foi feita para quem vende no Telegram, mas continue lendo ai porque ainda vou explicar o resto sem te dizer o proximo passo.',
    },
    { id: 'go_jump', type: 'GO', label: 'Atalho de rota', content: 'Desvia para o bloco seguinte.' },
    {
      id: 'tx_proof',
      type: 'TX',
      label: 'Prova',
      content: 'Ja ajudamos operacoes a vender mais com uma rotina simples e diaria.',
    },
    {
      id: 'tx_offer',
      data: {
        code: 'TX',
        title: 'Oferta',
        body: 'Se fizer sentido para voce, eu posso te mostrar os detalhes, condicoes e proximos passos, mas antes deixa eu te contar tudo de uma vez sem resumir.',
      },
    },
    {
      id: 'tx_urgency',
      type: 'TX',
      label: 'Urgencia',
      content: 'As vagas dessa rodada sao limitadas e eu preciso que voce me diga logo se quer continuar.',
    },
    {
      id: 'in_checkout',
      type: 'IN',
      label: 'Forma de pagamento',
      content: 'Me fala.',
    },
    { id: 'cv_sale', type: 'CV', label: 'Conversao', content: 'Pagamento confirmado.' },
    { id: 'ar_catalog', type: 'AR', label: 'Catalogo PDF', content: 'Catalogo do produto em PDF.' },
    {
      id: 'tx_faq',
      type: 'TX',
      label: 'FAQ solto',
      content: 'Se quiser, eu explico melhor depois.',
    },
    {
      id: 'tx_alt',
      type: 'TX',
      label: 'Rota alternativa',
      content: 'Tem muito potencial.',
    },
  ],
  edges: [
    { id: 'e1', source: 'tr_start', target: 'ms_invite' },
    { id: 'e2', source: 'ms_invite', target: 'tx_benefits' },
    { id: 'e3', source: 'ms_invite', target: 'tx_faq' },
    { id: 'e4', source: 'ms_invite', target: 'tx_alt' },
    { id: 'e5', from: 'tx_benefits', to: 'go_jump' },
    { id: 'e6', from: 'go_jump', to: 'tx_proof' },
    { id: 'e7', source: 'tx_proof', target: 'tx_offer' },
    { id: 'e8', source: 'tx_offer', target: 'tx_urgency' },
    { id: 'e9', source: 'tx_urgency', target: 'in_checkout' },
    { id: 'e10', source: 'in_checkout', target: 'cv_sale' },
  ],
}

const exampleLogsObject = [
  { userId: 'u1', type: 'node_view', currentNodeId: 'tr_start', timestamp: '2026-04-27T10:00:00.000Z' },
  { userId: 'u1', type: 'node_view', currentNodeId: 'ms_invite', timestamp: '2026-04-27T10:00:05.000Z' },
  { userId: 'u1', type: 'node_view', currentNodeId: 'tx_benefits', timestamp: '2026-04-27T10:00:12.000Z' },
  { userId: 'u1', type: 'node_view', currentNodeId: 'go_jump', timestamp: '2026-04-27T10:00:16.000Z' },
  { userId: 'u1', type: 'node_view', currentNodeId: 'tx_proof', timestamp: '2026-04-27T10:00:22.000Z' },
  { userId: 'u1', type: 'node_view', currentNodeId: 'tx_offer', timestamp: '2026-04-27T10:00:30.000Z' },
  { userId: 'u1', event: 'user_message', message: 'quanto custa?', nodeId: 'tx_offer', timestamp: '2026-04-27T10:00:36.000Z' },
  { userId: 'u1', type: 'node_view', currentNodeId: 'tx_urgency', timestamp: '2026-04-27T10:00:42.000Z' },
  { userId: 'u1', type: 'node_view', currentNodeId: 'in_checkout', timestamp: '2026-04-27T10:00:48.000Z' },
  { userId: 'u1', event: 'user_message', message: 'aceita cartao?', nodeId: 'in_checkout', timestamp: '2026-04-27T10:00:52.000Z' },
  { userId: 'u1', type: 'node_view', currentNodeId: 'cv_sale', timestamp: '2026-04-27T10:01:02.000Z' },

  { userId: 'u2', type: 'node_view', currentNodeId: 'tr_start', timestamp: '2026-04-27T10:04:00.000Z' },
  { userId: 'u2', type: 'node_view', currentNodeId: 'ms_invite', timestamp: '2026-04-27T10:04:05.000Z' },
  { userId: 'u2', type: 'node_view', currentNodeId: 'tx_benefits', timestamp: '2026-04-27T10:04:10.000Z' },
  { userId: 'u2', type: 'node_view', currentNodeId: 'go_jump', timestamp: '2026-04-27T10:04:14.000Z' },
  { userId: 'u2', type: 'node_view', currentNodeId: 'tx_proof', timestamp: '2026-04-27T10:04:20.000Z' },
  { userId: 'u2', type: 'node_view', currentNodeId: 'tx_offer', timestamp: '2026-04-27T10:04:26.000Z' },
  { userId: 'u2', event: 'user_message', message: 'quanto custa?', nodeId: 'tx_offer', timestamp: '2026-04-27T10:04:31.000Z' },
  { userId: 'u2', event: 'user_message', message: 'tem garantia?', nodeId: 'tx_offer', timestamp: '2026-04-27T10:04:38.000Z' },

  { userId: 'u3', type: 'node_view', currentNodeId: 'tr_start', timestamp: '2026-04-27T10:07:00.000Z' },
  { userId: 'u3', type: 'node_view', currentNodeId: 'ms_invite', timestamp: '2026-04-27T10:07:05.000Z' },
  { userId: 'u3', type: 'node_view', currentNodeId: 'tx_benefits', timestamp: '2026-04-27T10:07:11.000Z' },
  { userId: 'u3', type: 'node_view', currentNodeId: 'go_jump', timestamp: '2026-04-27T10:07:16.000Z' },
  { userId: 'u3', type: 'node_view', currentNodeId: 'tx_proof', timestamp: '2026-04-27T10:07:22.000Z' },
  { userId: 'u3', type: 'node_view', currentNodeId: 'tx_offer', timestamp: '2026-04-27T10:07:28.000Z' },
  { userId: 'u3', event: 'user_message', message: 'quanto custa?', nodeId: 'tx_offer', timestamp: '2026-04-27T10:07:33.000Z' },
  { userId: 'u3', type: 'node_view', currentNodeId: 'tx_urgency', timestamp: '2026-04-27T10:07:38.000Z' },
  { userId: 'u3', event: 'user_message', message: 'como funciona isso?', nodeId: 'tx_urgency', timestamp: '2026-04-27T10:07:44.000Z' },

  { userId: 'u4', type: 'node_view', currentNodeId: 'tr_start', timestamp: '2026-04-27T10:10:00.000Z' },
  { userId: 'u4', type: 'node_view', currentNodeId: 'ms_invite', timestamp: '2026-04-27T10:10:05.000Z' },
  { userId: 'u4', type: 'node_view', currentNodeId: 'tx_benefits', timestamp: '2026-04-27T10:10:11.000Z' },
  { userId: 'u4', type: 'node_view', currentNodeId: 'go_jump', timestamp: '2026-04-27T10:10:16.000Z' },
  { userId: 'u4', type: 'node_view', currentNodeId: 'tx_proof', timestamp: '2026-04-27T10:10:22.000Z' },
  { userId: 'u4', event: 'user_message', message: 'como funciona isso?', nodeId: 'tx_proof', timestamp: '2026-04-27T10:10:28.000Z' },

  { userId: 'u5', type: 'node_view', currentNodeId: 'tr_start', timestamp: '2026-04-27T10:13:00.000Z' },
  { userId: 'u5', type: 'node_view', currentNodeId: 'ms_invite', timestamp: '2026-04-27T10:13:05.000Z' },
  { userId: 'u5', type: 'node_view', currentNodeId: 'tx_benefits', timestamp: '2026-04-27T10:13:11.000Z' },
  { userId: 'u5', type: 'node_view', currentNodeId: 'go_jump', timestamp: '2026-04-27T10:13:16.000Z' },
  { userId: 'u5', type: 'node_view', currentNodeId: 'tx_proof', timestamp: '2026-04-27T10:13:22.000Z' },
  { userId: 'u5', type: 'node_view', currentNodeId: 'tx_offer', timestamp: '2026-04-27T10:13:28.000Z' },
  { userId: 'u5', event: 'user_message', message: 'quero falar com humano', nodeId: 'tx_offer', timestamp: '2026-04-27T10:13:35.000Z' },

  { sessionId: 'u6', type: 'node_view', meta: { nodeId: 'tr_start' }, createdAt: '2026-04-27T10:16:00.000Z' },
  { sessionId: 'u6', type: 'node_view', meta: { nodeId: 'ms_invite' }, createdAt: '2026-04-27T10:16:05.000Z' },
  { sessionId: 'u6', type: 'node_view', meta: { nodeId: 'tx_benefits' }, createdAt: '2026-04-27T10:16:10.000Z' },
  { sessionId: 'u6', type: 'node_view', meta: { nodeId: 'go_jump' }, createdAt: '2026-04-27T10:16:16.000Z' },
  { sessionId: 'u6', type: 'node_view', meta: { nodeId: 'tx_proof' }, createdAt: '2026-04-27T10:16:22.000Z' },
  { sessionId: 'u6', type: 'node_view', meta: { nodeId: 'tx_offer' }, createdAt: '2026-04-27T10:16:30.000Z' },
  { sessionId: 'u6', type: 'node_view', meta: { nodeId: 'tx_urgency' }, createdAt: '2026-04-27T10:16:37.000Z' },
  { sessionId: 'u6', type: 'node_view', meta: { nodeId: 'in_checkout' }, createdAt: '2026-04-27T10:16:43.000Z' },
  { sessionId: 'u6', event: 'user_message', payload: { message: 'como recebo o acesso?' }, meta: { nodeId: 'in_checkout' }, createdAt: '2026-04-27T10:16:48.000Z' },

  { sessionId: 'u7', type: 'node_view', meta: { nodeId: 'tr_start' }, createdAt: '2026-04-27T10:20:00.000Z' },
  { sessionId: 'u7', type: 'node_view', meta: { nodeId: 'ms_invite' }, createdAt: '2026-04-27T10:20:05.000Z' },
  { sessionId: 'u7', type: 'node_view', meta: { nodeId: 'tx_faq' }, createdAt: '2026-04-27T10:20:10.000Z' },
  { sessionId: 'u7', event: 'user_message', payload: { message: 'tem garantia?' }, meta: { nodeId: 'tx_faq' }, createdAt: '2026-04-27T10:20:16.000Z' },

  { sessionId: 'u8', type: 'node_view', meta: { nodeId: 'tr_start' }, createdAt: '2026-04-27T10:23:00.000Z' },
  { sessionId: 'u8', type: 'node_view', meta: { nodeId: 'ms_invite' }, createdAt: '2026-04-27T10:23:06.000Z' },
  { sessionId: 'u8', type: 'node_view', meta: { nodeId: 'tx_benefits' }, createdAt: '2026-04-27T10:23:12.000Z' },
  { sessionId: 'u8', type: 'node_view', meta: { nodeId: 'go_jump' }, createdAt: '2026-04-27T10:23:17.000Z' },
  { sessionId: 'u8', type: 'node_view', meta: { nodeId: 'tx_proof' }, createdAt: '2026-04-27T10:23:23.000Z' },
  { sessionId: 'u8', type: 'node_view', meta: { nodeId: 'tx_offer' }, createdAt: '2026-04-27T10:23:29.000Z' },
  { sessionId: 'u8', type: 'node_view', meta: { nodeId: 'tx_urgency' }, createdAt: '2026-04-27T10:23:35.000Z' },
  { sessionId: 'u8', type: 'node_view', meta: { nodeId: 'in_checkout' }, createdAt: '2026-04-27T10:23:42.000Z' },
  { sessionId: 'u8', event: 'user_message', payload: { message: 'quero falar com suporte' }, meta: { nodeId: 'in_checkout' }, createdAt: '2026-04-27T10:23:48.000Z' },
  { sessionId: 'u8', event: 'user_message', payload: { message: 'aceita cartao?' }, meta: { nodeId: 'in_checkout' }, createdAt: '2026-04-27T10:23:53.000Z' },

  { sessionId: 'u9', type: 'node_view', meta: { nodeId: 'tr_start' }, createdAt: '2026-04-27T10:26:00.000Z' },
  { sessionId: 'u9', type: 'node_view', meta: { nodeId: 'ms_invite' }, createdAt: '2026-04-27T10:26:06.000Z' },
  { sessionId: 'u9', type: 'node_view', meta: { nodeId: 'tx_alt' }, createdAt: '2026-04-27T10:26:12.000Z' },
  { sessionId: 'u9', event: 'user_message', payload: { message: 'como recebo o acesso?' }, meta: { nodeId: 'tx_alt' }, createdAt: '2026-04-27T10:26:18.000Z' },
]

export const flowIntelExampleFlowJson = JSON.stringify(exampleFlowObject, null, 2)
export const flowIntelExampleLogsJson = JSON.stringify(exampleLogsObject, null, 2)

export function parseFlowInput(input: string): ParseResult<ParsedFlow> {
  const errors: string[] = []
  const parsed = parseJson(input, 'Fluxo', errors)
  const flowRecord = asRecord(parsed)

  if (!flowRecord) {
    return { data: null, errors: errors.length ? errors : ['Fluxo precisa ser um objeto JSON.'], counts: { nodes: 0, edges: 0 } }
  }

  const rawNodes = Array.isArray(flowRecord.nodes) ? flowRecord.nodes : null
  const rawEdges = Array.isArray(flowRecord.edges) ? flowRecord.edges : null

  if (!rawNodes) {
    errors.push('Fluxo precisa conter um array "nodes".')
  }

  if (!rawEdges) {
    errors.push('Fluxo precisa conter um array "edges".')
  }

  if (!rawNodes || !rawEdges) {
    return { data: null, errors, counts: { nodes: 0, edges: 0 } }
  }

  const nodes = rawNodes.map((rawNode, index) => normalizeNode(rawNode, index))
  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges: ParsedFlowEdge[] = []

  rawEdges.forEach((rawEdge, index) => {
    const edgeRecord = asRecord(rawEdge)
    if (!edgeRecord) {
      errors.push(`Aresta ${index + 1} precisa ser um objeto.`)
      return
    }

    const source = readString(edgeRecord, ['source']) ?? readString(edgeRecord, ['from'])
    const target = readString(edgeRecord, ['target']) ?? readString(edgeRecord, ['to'])

    if (!source || !target) {
      errors.push(`Aresta ${index + 1} precisa informar source/target ou from/to.`)
      return
    }

    if (!nodeIds.has(source) || !nodeIds.has(target)) {
      errors.push(`Aresta ${index + 1} referencia um no inexistente.`)
      return
    }

    edges.push({
      id: readString(edgeRecord, ['id']) ?? `edge_${index + 1}`,
      source,
      target,
    })
  })

  return {
    data: { nodes, edges },
    errors,
    counts: { nodes: nodes.length, edges: edges.length },
  }
}

export function parseLogsInput(input: string): ParseResult<ParsedLogEntry[]> {
  const errors: string[] = []
  const parsed = parseJson(input, 'Logs', errors)
  const rootRecord = asRecord(parsed)

  let rawLogs: unknown[] | null = null

  if (Array.isArray(parsed)) {
    rawLogs = parsed
  } else if (rootRecord) {
    if (Array.isArray(rootRecord.logs)) {
      rawLogs = rootRecord.logs
    } else if (Array.isArray(rootRecord.events)) {
      rawLogs = rootRecord.events
    } else if (Array.isArray(rootRecord.data)) {
      rawLogs = rootRecord.data
    }
  }

  if (!rawLogs) {
    errors.push('Logs precisam ser um array JSON ou um objeto com "logs" ou "events".')
    return { data: null, errors, counts: { logs: 0 } }
  }

  const logs = rawLogs.map((rawLog, index) => normalizeLog(rawLog, index))

  if (!logs.length) {
    errors.push('Logs precisam conter pelo menos um evento.')
  }

  return {
    data: logs,
    errors,
    counts: { logs: logs.length },
  }
}

export function generateFlowIntelReport(flowInput: string, logsInput: string): {
  flowParse: ParseResult<ParsedFlow>
  logsParse: ParseResult<ParsedLogEntry[]>
  report: FlowIntelReport | null
} {
  const flowParse = parseFlowInput(flowInput)
  const logsParse = parseLogsInput(logsInput)

  if (!flowParse.data || !logsParse.data || flowParse.errors.length > 0 || logsParse.errors.length > 0) {
    return {
      flowParse,
      logsParse,
      report: null,
    }
  }

  return {
    flowParse,
    logsParse,
    report: {
      flow: flowParse.data,
      logs: logsParse.data,
      result: serializeAnalysis(analyzeFlow(flowParse.data, logsParse.data)),
    },
  }
}

export function analyzeFlow(flow: ParsedFlow, logs: ParsedLogEntry[]): AnalysisResult {
  const nodeMap = new Map(flow.nodes.map((node) => [node.id, node]))
  const { incoming, outgoing } = buildGraphIndexes(flow)
  const sessionSequences = buildSessionSequences(logs)
  const reached = new Map<string, number>()
  const stopped = new Map<string, number>()

  sessionSequences.forEach((sequence) => {
    sequence.forEach((nodeId) => {
      reached.set(nodeId, (reached.get(nodeId) ?? 0) + 1)
    })

    const lastNodeId = sequence[sequence.length - 1]
    if (!lastNodeId) {
      return
    }

    const lastNode = nodeMap.get(lastNodeId)
    if (lastNode && lastNode.type !== 'CV') {
      stopped.set(lastNodeId, (stopped.get(lastNodeId) ?? 0) + 1)
    }
  })

  const bottlenecks = flow.nodes
    .map((node) => {
      const reachedCount = reached.get(node.id) ?? 0
      const stoppedCount = stopped.get(node.id) ?? 0
      const dropRate = reachedCount > 0 ? roundPercentage((stoppedCount / reachedCount) * 100) : 0
      return {
        nodeId: node.id,
        nodeType: node.type,
        nodeLabel: node.label,
        dropRate,
        reachedCount,
        suggestion: buildBottleneckSuggestion(node),
      }
    })
    .filter((item) => item.nodeType !== 'CV' && item.reachedCount >= 3 && item.dropRate >= 25)
    .sort((a, b) => b.dropRate - a.dropRate)
    .map(({ reachedCount: _reachedCount, ...item }) => item)

  const messageEvaluations = flow.nodes
    .filter((node) => MESSAGE_NODE_TYPES.has(node.type))
    .map((node) => evaluateMessage(node))

  const unmappedIntents = buildUnmappedIntents(flow, logs)

  const structuralOptimizations = buildStructuralOptimizations(flow, incoming, outgoing)
  const expansionSuggestions = buildExpansionSuggestions(flow, bottlenecks, unmappedIntents)

  return {
    bottlenecks,
    messageEvaluations,
    unmappedIntents,
    structuralOptimizations,
    expansionSuggestions,
  }
}

export function buildFlowPreview(flow: ParsedFlow): {
  nodes: FlowPreviewNode[]
  edges: FlowPreviewEdge[]
} {
  const { incoming, outgoing } = buildGraphIndexes(flow)
  const roots = flow.nodes
    .filter((node) => (incoming.get(node.id)?.length ?? 0) === 0 || node.type === 'TR')
    .map((node) => node.id)

  const levelMap = new Map<string, number>()
  const queue = [...new Set(roots.length ? roots : flow.nodes.map((node) => node.id))]

  queue.forEach((nodeId) => {
    if (!levelMap.has(nodeId)) {
      levelMap.set(nodeId, 0)
    }
  })

  while (queue.length > 0) {
    const currentId = queue.shift()
    if (!currentId) {
      continue
    }

    const currentLevel = levelMap.get(currentId) ?? 0
    const children = outgoing.get(currentId) ?? []
    children.forEach((childId) => {
      const nextLevel = currentLevel + 1
      if (!levelMap.has(childId) || nextLevel > (levelMap.get(childId) ?? 0)) {
        levelMap.set(childId, nextLevel)
        queue.push(childId)
      }
    })
  }

  let fallbackLevel = Math.max(...Array.from(levelMap.values()), 0) + 1
  flow.nodes.forEach((node) => {
    if (!levelMap.has(node.id)) {
      levelMap.set(node.id, fallbackLevel)
      fallbackLevel += 1
    }
  })

  const byLevel = new Map<number, ParsedFlowNode[]>()
  flow.nodes.forEach((node) => {
    const level = levelMap.get(node.id) ?? 0
    const bucket = byLevel.get(level) ?? []
    bucket.push(node)
    byLevel.set(level, bucket)
  })

  const previewNodes: FlowPreviewNode[] = []
  Array.from(byLevel.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([level, nodesAtLevel]) => {
      nodesAtLevel.forEach((node, index) => {
        previewNodes.push({
          id: node.id,
          type: 'flowNode',
          position: node.position ?? { x: level * 320, y: index * 180 },
          data: {
            code: node.type,
            category: node.category,
            title: node.label,
            description: node.text || blockLabelFromCode(node.type),
            text: node.text,
            options: node.options,
          },
        })
      })
    })

  const previewEdges = flow.edges.map((edge) => {
    const sourceNode = flow.nodes.find((node) => node.id === edge.source)
    const stroke = sourceNode ? BLOCK_CODE_MAP.get(sourceNode.type)?.category ?? 'sistema' : 'sistema'
    const category = sourceNode?.category ?? 'sistema'
    const color = colorForCategory(category)

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep' as const,
      animated: sourceNode?.type === 'GO',
      style: {
        stroke: colorForCategory(stroke as Category) || color,
        strokeWidth: 1.6,
        opacity: 0.82,
      },
    }
  })

  return {
    nodes: previewNodes,
    edges: previewEdges,
  }
}

function parseJson(input: string, label: string, errors: string[]) {
  const trimmed = input.trim()
  if (!trimmed) {
    errors.push(`${label} nao pode ficar vazio.`)
    return null
  }

  try {
    return JSON.parse(trimmed)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'JSON invalido.'
    errors.push(`${label} contem JSON invalido: ${message}`)
    return null
  }
}

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as UnknownRecord
}

function readValue(record: UnknownRecord, path: string[]): unknown {
  let current: unknown = record

  for (const key of path) {
    const currentRecord = asRecord(current)
    if (!currentRecord || !(key in currentRecord)) {
      return undefined
    }

    current = currentRecord[key]
  }

  return current
}

function readString(record: UnknownRecord, path: string[]): string | undefined {
  const value = readValue(record, path)
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return undefined
}

function normalizeNode(rawNode: unknown, index: number): ParsedFlowNode {
  const record = asRecord(rawNode) ?? {}
  const data = asRecord(record.data) ?? {}
  const id = readString(record, ['id']) ?? readString(data, ['id']) ?? `node_${index + 1}`
  const type = normalizeBlockCode(
    readString(record, ['type']) ??
      readString(record, ['code']) ??
      readString(data, ['code']) ??
      readString(data, ['type']) ??
      readString(record, ['label']) ??
      readString(record, ['title']) ??
      readString(data, ['title']),
  )
  const text =
    readString(record, ['content']) ??
    readString(record, ['text']) ??
    readString(record, ['message']) ??
    readString(record, ['body']) ??
    readString(data, ['content']) ??
    readString(data, ['text']) ??
    readString(data, ['message']) ??
    readString(data, ['body']) ??
    ''
  const label =
    readString(record, ['label']) ??
    readString(record, ['title']) ??
    readString(data, ['label']) ??
    readString(data, ['title']) ??
    blockLabelFromCode(type) ??
    id

  return {
    id,
    type,
    label,
    text,
    options: extractOptions(record, data),
    category: categoryFromCode(type),
    position: extractPosition(record, data),
  }
}

function normalizeLog(rawLog: unknown, index: number): ParsedLogEntry {
  const record = asRecord(rawLog) ?? {}
  const payload = asRecord(record.payload) ?? {}
  const meta = asRecord(record.meta) ?? {}
  const timestamp =
    readString(record, ['timestamp']) ??
    readString(record, ['createdAt']) ??
    readString(record, ['date']) ??
    new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString()
  const parsedTime = Date.parse(timestamp)

  return {
    sessionId: readString(record, ['sessionId']) ?? readString(record, ['userId']) ?? `session_${index + 1}`,
    event: normalizeEvent(readString(record, ['event']) ?? readString(record, ['type']) ?? 'event'),
    message: readString(record, ['message']) ?? readString(record, ['text']) ?? readString(payload, ['message']) ?? '',
    nodeId: readString(record, ['nodeId']) ?? readString(record, ['currentNodeId']) ?? readString(meta, ['nodeId']),
    timestamp,
    sortKey: Number.isNaN(parsedTime) ? index : parsedTime,
    rawIndex: index,
  }
}

function extractOptions(record: UnknownRecord, data: UnknownRecord): string[] {
  const optionSource =
    readValue(record, ['options']) ??
    readValue(record, ['buttons']) ??
    readValue(data, ['options']) ??
    readValue(data, ['buttons'])

  if (!Array.isArray(optionSource)) {
    return []
  }

  return optionSource
    .map((option) => {
      if (typeof option === 'string') {
        return option.trim()
      }

      const optionRecord = asRecord(option)
      if (!optionRecord) {
        return ''
      }

      return (
        readString(optionRecord, ['label']) ??
        readString(optionRecord, ['text']) ??
        readString(optionRecord, ['title']) ??
        readString(optionRecord, ['value']) ??
        ''
      )
    })
    .filter(Boolean)
}

function extractPosition(record: UnknownRecord, data: UnknownRecord) {
  const positionRecord = asRecord(readValue(record, ['position']) ?? readValue(data, ['position']))
  if (!positionRecord) {
    return undefined
  }

  const x = Number(positionRecord.x)
  const y = Number(positionRecord.y)

  if (Number.isFinite(x) && Number.isFinite(y)) {
    return { x, y }
  }

  return undefined
}

function normalizeTextToken(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function normalizeBlockCode(value: string | undefined) {
  if (!value) {
    return 'TX'
  }

  return TYPE_ALIASES.get(normalizeTextToken(value)) ?? normalizeTextToken(value)
}

function normalizeEvent(value: string) {
  const normalized = normalizeTextToken(value).toLowerCase().replace(/\s+/g, '_')
  if (['user_message', 'usermessage', 'message_user'].includes(normalized)) {
    return 'user_message'
  }

  return normalized
}

function blockLabelFromCode(code: string) {
  return BLOCK_CODE_MAP.get(code)?.title ?? code
}

function categoryFromCode(code: string): Category {
  return BLOCK_CODE_MAP.get(code)?.category ?? 'comunicacao'
}

function colorForCategory(category: Category) {
  switch (category) {
    case 'sistema':
      return '#00d4ff'
    case 'comunicacao':
      return '#ff2a9d'
    case 'logica':
      return '#ff9d2a'
    case 'pagamento':
      return '#39ff14'
    case 'entrega':
      return '#b44dff'
    default:
      return '#00d4ff'
  }
}

function buildGraphIndexes(flow: ParsedFlow) {
  const incoming = new Map<string, string[]>()
  const outgoing = new Map<string, string[]>()

  flow.nodes.forEach((node) => {
    incoming.set(node.id, [])
    outgoing.set(node.id, [])
  })

  flow.edges.forEach((edge) => {
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge.source])
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target])
  })

  return { incoming, outgoing }
}

function buildSessionSequences(logs: ParsedLogEntry[]) {
  const sessions = new Map<string, ParsedLogEntry[]>()

  logs.forEach((log) => {
    const bucket = sessions.get(log.sessionId) ?? []
    bucket.push(log)
    sessions.set(log.sessionId, bucket)
  })

  return Array.from(sessions.values()).map((entries) => {
    const ordered = [...entries].sort((a, b) => a.sortKey - b.sortKey || a.rawIndex - b.rawIndex)
    const sequence: string[] = []

    ordered.forEach((entry) => {
      if (!entry.nodeId) {
        return
      }

      const last = sequence[sequence.length - 1]
      if (last !== entry.nodeId) {
        sequence.push(entry.nodeId)
      }
    })

    return sequence
  })
}

function buildBottleneckSuggestion(node: ParsedFlowNode) {
  switch (node.type) {
    case 'MS':
    case 'TX':
      return 'Enxugue a mensagem, adicione um CTA explicito e considere inserir um TP antes deste passo para dar ritmo mais humano.'
    case 'BT':
      return 'Simplifique as opcoes deste BT, deixe cada botao autoexplicativo e abra um subfluxo de FAQ para as duvidas recorrentes.'
    case 'IN':
      return 'Adicione um BT de pre-qualificacao antes deste IN ou um TP antes da pergunta para reduzir atrito na resposta.'
    case 'DL':
    case 'SD':
      return 'Reveja a espera e antecipe valor com uma TX curta antes do atraso para evitar esfriar a conversa.'
    case 'GO':
      return 'Se este desvio nao carrega logica real, troque o GO por conexao direta; se houver duvida do usuario, use BT ou RD para contextualizar.'
    default:
      return 'Adicione um BT com opcoes claras ou um TP antes deste bloco para reduzir abandono.'
  }
}

function evaluateMessage(node: ParsedFlowNode) {
  const currentText = composeNodeText(node)
  let score = 5

  if (!currentText.trim()) {
    score -= 2
  }

  if (currentText.length > 180) {
    score -= 1
  }

  if (currentText.length > 320) {
    score -= 1
  }

  if (!CTA_PATTERN.test(currentText) && node.type !== 'IN') {
    score -= 1
  }

  if ((node.type === 'MS' || node.type === 'TX') && isVagueSalesCopy(currentText)) {
    score -= 1
  }

  if ((currentText.match(/\?/g) ?? []).length > 1) {
    score -= 1
  }

  if (node.type === 'IN' && !/\?/.test(currentText)) {
    score -= 1
  }

  if (node.type === 'BT') {
    if (node.options.length < 2) {
      score -= 1
    }

    if (node.options.some((option) => option.length > 32 || /^(sim|nao|ok|continuar)$/i.test(option))) {
      score -= 1
    }
  }

  if (node.type === 'TX' && currentText.length < 32) {
    score -= 1
  }

  score = Math.max(1, Math.min(5, score))

  return {
    nodeId: node.id,
    currentText,
    score,
    improvedText: score < 4 ? buildImprovedText(node) : currentText,
  }
}

function composeNodeText(node: ParsedFlowNode) {
  if (node.type === 'BT' && node.options.length > 0) {
    return `${node.text}\nOpcoes: ${node.options.join(' | ')}`
  }

  return node.text
}

function buildImprovedText(node: ParsedFlowNode) {
  if (node.type === 'BT') {
    return 'Escolha a opcao que melhor descreve sua duvida para eu te responder mais rapido:\n- Ver preco\n- Como funciona\n- Falar com suporte'
  }

  if (node.type === 'IN') {
    return 'Me responda em uma frase: qual e sua principal duvida antes de continuar?'
  }

  const benefit = inferBenefit(node.text)
  return `${benefit} Se fizer sentido para voce, toque em "Quero continuar" para receber os proximos passos.`
}

function inferBenefit(text: string) {
  const normalized = normalizeTextToken(text).toLowerCase()

  if (/\b(venda|vendas|converter|conversao)\b/.test(normalized)) {
    return 'Eu vou te mostrar como esse fluxo pode aumentar suas vendas no Telegram.'
  }

  if (/\b(suporte|atendimento)\b/.test(normalized)) {
    return 'Voce vai entender exatamente como o suporte funciona antes de decidir.'
  }

  if (/\b(acesso|grupo|entrega)\b/.test(normalized)) {
    return 'Eu vou te explicar como o acesso e entregue logo depois da compra.'
  }

  return 'Em poucos passos eu te mostro o que voce recebe e como seguir sem enrolacao.'
}

function isVagueSalesCopy(text: string) {
  if (CTA_PATTERN.test(text)) {
    return false
  }

  return /\b(calma|por enquanto|detalhes|resto|depois|alguma coisa|coisas)\b/i.test(text)
}

function buildUnmappedIntents(flow: ParsedFlow, logs: ParsedLogEntry[]) {
  const flowText = flow.nodes
    .map((node) => `${node.label} ${node.text} ${node.options.join(' ')}`)
    .join(' ')

  return INTENT_BUCKETS.map((bucket) => {
    const frequency = logs.filter((log) => log.event === 'user_message' && bucket.regex.test(log.message)).length
    const hasSupport =
      bucket.supportRegex.test(flowText) ||
      (bucket.id === 'pagamento' && flow.nodes.some((node) => PAYMENT_NODE_TYPES.has(node.type))) ||
      (bucket.id === 'acesso' && flow.nodes.some((node) => DELIVERY_NODE_TYPES.has(node.type)))

    if (frequency < 2 || hasSupport) {
      return null
    }

    return {
      intent: bucket.label,
      frequency,
      suggestedNodeType: bucket.suggestedNodeType,
      exampleImplementation: bucket.exampleImplementation,
    }
  }).filter(Boolean) as AnalysisResult['unmappedIntents']
}

function buildStructuralOptimizations(
  flow: ParsedFlow,
  incoming: Map<string, string[]>,
  outgoing: Map<string, string[]>,
) {
  const issues: AnalysisResult['structuralOptimizations'] = []

  const isolatedNodes = flow.nodes.filter((node) => {
    const inDegree = incoming.get(node.id)?.length ?? 0
    const outDegree = outgoing.get(node.id)?.length ?? 0
    return inDegree === 0 && outDegree === 0
  })

  if (isolatedNodes.length > 0) {
    issues.push({
      issue: 'Nos desconectados sem entrada ou saida.',
      nodeIds: isolatedNodes.map((node) => node.id),
      recommendation: 'Remova esses nos ou conecte-os a um caminho valido antes de publicar o fluxo.',
    })
  }

  const leafNodes = flow.nodes.filter((node) => node.type !== 'CV' && (outgoing.get(node.id)?.length ?? 0) === 0)
  if (leafNodes.length > 0) {
    issues.push({
      issue: 'Folhas sem conversao final.',
      nodeIds: leafNodes.map((node) => node.id),
      recommendation: 'Feche essas rotas com CV, redirecione para um FAQ util ou reconecte ao fluxo principal.',
    })
  }

  const longSegment = findLongestUnpausedSegment(flow, outgoing)
  if (longSegment.length > 5) {
    issues.push({
      issue: 'Caminho longo sem pausas intermediarias.',
      nodeIds: longSegment,
      recommendation: 'Insira DL ou SD entre blocos consecutivos para reduzir fadiga e dar tempo de assimilacao.',
    })
  }

  const simplifiableGos = flow.nodes.filter((node) => {
    const inDegree = incoming.get(node.id)?.length ?? 0
    const outDegree = outgoing.get(node.id)?.length ?? 0
    return node.type === 'GO' && inDegree === 1 && outDegree === 1
  })
  if (simplifiableGos.length > 0) {
    issues.push({
      issue: 'Uso de GO simplificavel.',
      nodeIds: simplifiableGos.map((node) => node.id),
      recommendation: 'Troque esses GOs por conexoes diretas onde nao houver logica adicional.',
    })
  }

  const complexBranches = flow.nodes.filter((node) => {
    const outDegree = outgoing.get(node.id)?.length ?? 0
    return outDegree >= 3 && !['BT', 'RD', 'GT'].includes(node.type)
  })
  if (complexBranches.length > 0) {
    issues.push({
      issue: 'Ramificacoes complexas sem bloco apropriado de escolha.',
      nodeIds: complexBranches.map((node) => node.id),
      recommendation: 'Substitua essas saidas por BT para escolhas explicitas ou RD para variacao controlada.',
    })
  }

  return issues
}

function findLongestUnpausedSegment(flow: ParsedFlow, outgoing: Map<string, string[]>) {
  const roots = flow.nodes
    .filter((node) => (flow.edges.filter((edge) => edge.target === node.id).length === 0) || node.type === 'TR')
    .map((node) => node.id)

  let longest: string[] = []

  const visit = (nodeId: string, streak: string[], path: Set<string>) => {
    if (path.has(nodeId)) {
      return
    }

    const node = flow.nodes.find((item) => item.id === nodeId)
    if (!node) {
      return
    }

    const nextPath = new Set(path)
    nextPath.add(nodeId)

    const nextStreak = PAUSE_NODE_TYPES.has(node.type) ? [] : [...streak, nodeId]
    if (nextStreak.length > longest.length) {
      longest = nextStreak
    }

    const children = outgoing.get(nodeId) ?? []
    children.forEach((childId) => visit(childId, nextStreak, nextPath))
  }

  ;(roots.length ? roots : flow.nodes.map((node) => node.id)).forEach((rootId) => visit(rootId, [], new Set()))

  return longest
}

function buildExpansionSuggestions(
  flow: ParsedFlow,
  bottlenecks: AnalysisResult['bottlenecks'],
  unmappedIntents: AnalysisResult['unmappedIntents'],
) {
  const suggestions: string[] = []
  const hasCode = (code: string) => flow.nodes.some((node) => node.type === code)
  const hasAnyPaymentSignal =
    flow.nodes.some((node) => PAYMENT_NODE_TYPES.has(node.type)) ||
    unmappedIntents.some((intent) => intent.intent === 'Duvidas sobre preco' || intent.intent === 'Duvidas sobre pagamento')

  if (!hasCode('OB') && (hasCode('CV') || hasAnyPaymentSignal)) {
    suggestions.push('Adicionar um Order Bump imediatamente antes do CV para capturar receita extra enquanto o usuario ja esta aquecido.')
  }

  const hasFaqPressure = unmappedIntents.some((intent) =>
    ['Duvidas sobre preco', 'Duvidas sobre garantia', 'Duvidas sobre como funciona', 'Duvidas sobre pagamento'].includes(intent.intent),
  )
  if (hasFaqPressure) {
    suggestions.push('Criar um subfluxo de FAQ comercial com BT para Preco, Garantia e Como funciona logo apos a primeira oferta.')
  }

  const hasPostConversion = hasCode('EP') || hasCode('AG')
  if (!hasPostConversion && hasCode('CV')) {
    suggestions.push('Acrescentar um subfluxo pos-conversao com EP ou AG e um IN curto para confirmar acesso e reduzir suporte reativo.')
  }

  if (suggestions.length < 3 && !hasCode('AR') && bottlenecks.some((item) => ['MS', 'TX'].includes(item.nodeType))) {
    suggestions.push('Inserir um bloco AR com material de apoio ou catalogo logo apos a apresentacao para antecipar valor e reduzir duvidas repetidas.')
  }

  return suggestions.slice(0, 3)
}

function roundPercentage(value: number) {
  return Number(value.toFixed(1))
}

function serializeAnalysis(result: AnalysisResult): AnalysisResult {
  return {
    bottlenecks: result.bottlenecks.map((item) => ({
      nodeId: item.nodeId,
      nodeType: item.nodeType,
      nodeLabel: item.nodeLabel,
      dropRate: item.dropRate,
      suggestion: item.suggestion,
    })),
    messageEvaluations: result.messageEvaluations.map((item) => ({
      nodeId: item.nodeId,
      currentText: item.currentText,
      score: item.score,
      improvedText: item.improvedText,
    })),
    unmappedIntents: result.unmappedIntents.map((item) => ({
      intent: item.intent,
      frequency: item.frequency,
      suggestedNodeType: item.suggestedNodeType,
      exampleImplementation: item.exampleImplementation,
    })),
    structuralOptimizations: result.structuralOptimizations.map((item) => ({
      issue: item.issue,
      nodeIds: [...item.nodeIds],
      recommendation: item.recommendation,
    })),
    expansionSuggestions: [...result.expansionSuggestions],
  }
}
