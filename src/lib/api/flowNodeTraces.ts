import type { Category } from '@/lib/blocks'
import { supabase } from '@/lib/supabase'
import type { Database, Json } from '@/lib/database.types'

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

type LeadFlowEventRow = Database['public']['Tables']['lead_flow_events']['Row']

export async function getNodeRuntimeHealth({
  flowId,
  botId,
  nodes,
}: NodeTraceQuery): Promise<Record<string, NodeRuntimeHealth>> {
  const health = buildEmptyHealth(nodes)

  if (nodes.length === 0) return health

  const nodeIds = nodes.map((node) => node.id)
  let query = supabase
    .from('lead_flow_events')
    .select('id,bot_id,created_at,event_type,flow_id,lead_id,message,metadata,node_id,node_label,node_type,occurred_at,owner_id,status')
    .eq('flow_id', flowId)
    .eq('event_type', 'node_error')
    .in('node_id', nodeIds)
    .order('occurred_at', { ascending: false })
    .limit(200)

  if (botId) {
    query = query.eq('bot_id', botId)
  }

  const { data, error } = await query

  if (error) {
    console.warn('Falha ao carregar traces reais do fluxo', error)
    return health
  }

  const traces = (data ?? []).map(toFlowNodeTrace)

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
  let query = supabase
    .from('lead_flow_events')
    .select('id,bot_id,created_at,event_type,flow_id,lead_id,message,metadata,node_id,node_label,node_type,occurred_at,owner_id,status')
    .eq('flow_id', flowId)
    .eq('node_id', node.id)
    .eq('event_type', 'node_error')
    .order('occurred_at', { ascending: false })
    .limit(limit)

  if (botId) {
    query = query.eq('bot_id', botId)
  }

  const { data, error } = await query

  if (error) {
    console.warn('Falha ao carregar logs reais do no', error)
    return []
  }

  return (data ?? []).map(toFlowNodeTrace)
}

export async function recordNodeTrace(trace: Omit<FlowNodeTrace, '_id' | 'createdAt'>) {
  return {
    ...trace,
    _id: `mongo_${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
  } satisfies FlowNodeTrace
}

function buildEmptyHealth(nodes: FlowTraceNodeRef[]): Record<string, NodeRuntimeHealth> {
  return Object.fromEntries(
    nodes.map((node) => [
      node.id,
      {
        nodeId: node.id,
        status: 'ok',
        errorCount: 0,
        lastErrorAt: null,
        lastTraceId: null,
      } satisfies NodeRuntimeHealth,
    ]),
  )
}

function toFlowNodeTrace(event: LeadFlowEventRow): FlowNodeTrace {
  const metadata = toRecord(event.metadata)
  const error = toRecord(metadata.error)
  const input = toRecord(metadata.input)
  const output = toRecord(metadata.output)
  const startedAt = stringValue(metadata.startedAt) || event.occurred_at
  const finishedAt = stringValue(metadata.finishedAt) || event.occurred_at
  const durationMs = numberValue(metadata.durationMs) ?? Math.max(0, Date.parse(finishedAt) - Date.parse(startedAt))

  return {
    _id: event.id,
    traceId: stringValue(metadata.traceId) || event.id,
    flowId: event.flow_id ?? '',
    botId: event.bot_id,
    telegramChatId: stringValue(metadata.telegramChatId) || '',
    userId: event.lead_id,
    nodeId: event.node_id ?? '',
    nodeType: event.node_type ?? '',
    nodeLabel: event.node_label ?? event.node_type ?? 'No',
    status: 'error',
    startedAt,
    finishedAt,
    durationMs,
    input,
    output,
    error: {
      code: stringValue(error.code) || 'NODE_EXECUTION_ERROR',
      message: stringValue(error.message) || event.message || 'Falha ao executar este bloco.',
      stack: stringValue(error.stack) || undefined,
      retryable: Boolean(error.retryable),
    },
    createdAt: event.created_at,
  }
}

function toRecord(value: Json | unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function numberValue(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
