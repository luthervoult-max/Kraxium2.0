import { supabase } from '@/lib/supabase'
import type { Json, Tables } from '@/lib/database.types'

export type Flow = Tables<'flows'>
export type FlowStatus = 'active' | 'paused' | 'draft'

export interface FlowGraph {
  nodes: Array<{
    id: string
    type: string
    label: string
    content: string
    options?: string[]
    config?: Record<string, unknown>
    outputs?: Array<{ id: string; label: string }>
    position: { x: number; y: number }
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
    label?: string
  }>
}

export interface FlowWithBot extends Flow {
  bot: { id: string; name: string } | null
  metrics: {
    starts: number
    conversionRate: number
    leads: number
  }
}

export interface SaveFlowWithBotInput {
  flowId?: string | null
  name: string
  graph: FlowGraph
  botId: string
}

const flowSelect = `
  *,
  bot:bots(id,name)
`

export async function listFlowsWithBots(): Promise<FlowWithBot[]> {
  const { data, error } = await supabase
    .from('flows')
    .select(flowSelect)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw error

  const flows = (data ?? []) as Array<Flow & { bot: { id: string; name: string } | null }>
  const metrics = await getMetricsByFlowId(flows.map((flow) => flow.id))

  return flows.map((flow) => ({
    ...flow,
    metrics: metrics[flow.id] ?? { starts: 0, conversionRate: 0, leads: 0 },
  }))
}

export async function getFlowById(flowId: string) {
  const { data, error } = await supabase
    .from('flows')
    .select('*')
    .eq('id', flowId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getActiveFlowByBotId(botId: string) {
  const { data, error } = await supabase
    .from('flows')
    .select('*')
    .eq('bot_id', botId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw error
  return data
}

export const getFlowByBotId = getActiveFlowByBotId

export async function saveFlow(flowId: string, name: string, graph: FlowGraph) {
  const { data, error } = await supabase
    .from('flows')
    .update({ name, graph: graph as unknown as Json })
    .eq('id', flowId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function saveFlowWithBot({ flowId, name, graph, botId }: SaveFlowWithBotInput) {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!authData.user) throw new Error('Voce precisa estar logado para salvar o fluxo.')

  const normalizedName = name.trim() || 'Sem nome'

  let pauseQuery = supabase
    .from('flows')
    .update({ bot_id: null, status: 'paused' })
    .eq('owner_id', authData.user.id)
    .eq('bot_id', botId)
    .eq('status', 'active')

  if (flowId) {
    pauseQuery = pauseQuery.neq('id', flowId)
  }

  const { error: pauseError } = await pauseQuery
  if (pauseError) throw pauseError

  if (flowId) {
    const { data, error } = await supabase
      .from('flows')
      .update({
        bot_id: botId,
        name: normalizedName,
        graph: graph as unknown as Json,
        status: 'active',
      })
      .eq('id', flowId)
      .eq('owner_id', authData.user.id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('flows')
    .insert({
      bot_id: botId,
      owner_id: authData.user.id,
      name: normalizedName,
      graph: graph as unknown as Json,
      status: 'active',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function upsertFlowByBotId(botId: string, name: string, graph: FlowGraph) {
  const existing = await getActiveFlowByBotId(botId)
  return saveFlowWithBot({
    flowId: existing?.id ?? null,
    botId,
    name,
    graph,
  })
}

async function getMetricsByFlowId(flowIds: string[]) {
  if (flowIds.length === 0) return {}

  const { data, error } = await supabase
    .from('telegram_leads')
    .select('flow_id,start_count,status')
    .in('flow_id', flowIds)

  if (error) {
    return {}
  }

  return (data ?? []).reduce<Record<string, { starts: number; conversionRate: number; leads: number; paid: number }>>(
    (acc, lead) => {
      if (!lead.flow_id) return acc

      const current = acc[lead.flow_id] ?? { starts: 0, conversionRate: 0, leads: 0, paid: 0 }
      current.starts += Number(lead.start_count ?? 0)
      current.leads += 1
      if (lead.status === 'pago') {
        current.paid += 1
      }
      current.conversionRate = current.leads === 0 ? 0 : Math.round((current.paid / current.leads) * 100)
      acc[lead.flow_id] = current

      return acc
    },
    {},
  )
}
