import type { Category } from '@/lib/blocks'

export type NodeTraceStatus = 'success' | 'error' | 'skipped'
export type NodeRuntimeStatus = 'ok' | 'error'

export interface FlowTraceNodeRef {
  id: string
  type: string
  label: string
  category: Category
}

export interface FlowNodeTrace {
  _id: string
  traceId: string
  flowId: string
  botId: string | null
  telegramChatId: string
  userId: string
  nodeId: string
  nodeType: string
  nodeLabel: string
  status: NodeTraceStatus
  startedAt: string
  finishedAt: string
  durationMs: number
  input: Record<string, unknown>
  output?: Record<string, unknown>
  error?: {
    code: string
    message: string
    stack?: string
    retryable: boolean
  }
  createdAt: string
}

export interface NodeRuntimeHealth {
  nodeId: string
  status: NodeRuntimeStatus
  errorCount: number
  lastErrorAt: string | null
  lastTraceId: string | null
}

interface NodeTraceQuery {
  flowId: string
  botId: string | null
  nodes: FlowTraceNodeRef[]
}

interface NodeErrorQuery {
  flowId: string
  botId: string | null
  node: FlowTraceNodeRef
  limit?: number
}

// MongoDB production shape:
// collection: flow_node_traces
// indexes:
// db.flow_node_traces.createIndex({ flowId: 1, nodeId: 1, status: 1, createdAt: -1 })
// db.flow_node_traces.createIndex({ traceId: 1, createdAt: 1 })
// db.flow_node_traces.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 })
const errorTemplatesByNodeType: Record<string, Array<Pick<FlowNodeTrace, 'error' | 'durationMs' | 'input'>>> = {
  SD: [
    {
      durationMs: 1420,
      input: { timezone: 'America/Sao_Paulo', delaySeconds: 900 },
      error: {
        code: 'SMART_DELAY_TIMEZONE_INVALID',
        message: 'Timezone do usuario veio vazio antes de calcular a janela de envio.',
        retryable: false,
      },
    },
    {
      durationMs: 2388,
      input: { timezone: 'America/Manaus', delaySeconds: 1800 },
      error: {
        code: 'SMART_DELAY_QUEUE_TIMEOUT',
        message: 'Fila do Telegram demorou mais que o limite para reagendar a mensagem.',
        retryable: true,
      },
    },
    {
      durationMs: 905,
      input: { timezone: 'America/Manaus', delaySeconds: 300 },
      error: {
        code: 'SMART_DELAY_WINDOW_CLOSED',
        message: 'Janela permitida fechou durante o processamento do atraso inteligente.',
        retryable: true,
      },
    },
  ],
  PX: [
    {
      durationMs: 3110,
      input: { amount: 9700, currency: 'BRL' },
      error: {
        code: 'PIX_PROVIDER_UNAVAILABLE',
        message: 'Gateway de pagamento recusou a criacao do PIX temporariamente.',
        retryable: true,
      },
    },
  ],
  AG: [
    {
      durationMs: 1844,
      input: { channelId: '@vip_channel' },
      error: {
        code: 'TELEGRAM_INVITE_FAILED',
        message: 'Telegram nao retornou link de convite para o grupo configurado.',
        retryable: true,
      },
    },
  ],
}

export async function getNodeRuntimeHealth({
  flowId,
  botId,
  nodes,
}: NodeTraceQuery): Promise<Record<string, NodeRuntimeHealth>> {
  const traces = buildMongoExampleTraces(flowId, botId, nodes)
  const health: Record<string, NodeRuntimeHealth> = {}

  nodes.forEach((node) => {
    const nodeErrors = traces
      .filter((trace) => trace.nodeId === node.id && trace.status === 'error')
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))

    health[node.id] = {
      nodeId: node.id,
      status: nodeErrors.length > 0 ? 'error' : 'ok',
      errorCount: nodeErrors.length,
      lastErrorAt: nodeErrors[0]?.createdAt ?? null,
      lastTraceId: nodeErrors[0]?.traceId ?? null,
    }
  })

  return health
}

export async function getRecentNodeErrorLogs({
  flowId,
  botId,
  node,
  limit = 3,
}: NodeErrorQuery): Promise<FlowNodeTrace[]> {
  return buildMongoExampleTraces(flowId, botId, [node])
    .filter((trace) => trace.nodeId === node.id && trace.status === 'error')
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit)
}

export async function recordNodeTrace(trace: Omit<FlowNodeTrace, '_id' | 'createdAt'>) {
  return {
    ...trace,
    _id: `mongo_${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
  } satisfies FlowNodeTrace
}

function buildMongoExampleTraces(
  flowId: string,
  botId: string | null,
  nodes: FlowTraceNodeRef[],
) {
  const now = Date.now()

  return nodes.flatMap((node) => {
    const templates = errorTemplatesByNodeType[node.type] ?? []

    return templates.map((template, index) => {
      const createdAt = new Date(now - index * 1000 * 60 * 11).toISOString()
      const startedAt = new Date(Date.parse(createdAt) - template.durationMs).toISOString()

      return {
        _id: `mock_${node.id}_${index}`,
        traceId: `trace_${node.id}_${index + 1}`,
        flowId,
        botId,
        telegramChatId: '987654321',
        userId: 'tg_user_123',
        nodeId: node.id,
        nodeType: node.type,
        nodeLabel: node.label,
        status: 'error',
        startedAt,
        finishedAt: createdAt,
        durationMs: template.durationMs,
        input: template.input,
        output: { nextNodeId: null },
        error: template.error,
        createdAt,
      } satisfies FlowNodeTrace
    })
  })
}
