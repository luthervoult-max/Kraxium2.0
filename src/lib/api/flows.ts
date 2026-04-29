import { supabase } from '@/lib/supabase'
import type { Json, Tables } from '@/lib/database.types'

export type Flow = Tables<'flows'>

export interface FlowGraph {
  nodes: Array<{
    id: string
    type: string
    label: string
    content: string
    options?: string[]
    position: { x: number; y: number }
  }>
  edges: Array<{ id: string; source: string; target: string }>
}

export async function getFlowByBotId(botId: string) {
  const { data, error } = await supabase
    .from('flows')
    .select('*')
    .eq('bot_id', botId)
    .maybeSingle()
  if (error) throw error
  return data
}

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

export async function upsertFlowByBotId(botId: string, name: string, graph: FlowGraph) {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!authData.user) throw new Error('Voce precisa estar logado para salvar o fluxo.')

  const { data, error } = await supabase
    .from('flows')
    .upsert(
      {
        bot_id: botId,
        owner_id: authData.user.id,
        name,
        graph: graph as unknown as Json,
      },
      { onConflict: 'bot_id' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}
