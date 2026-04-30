import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'

export type Bot = Tables<'bots'>
export type BotInsert = TablesInsert<'bots'>
export type BotUpdate = TablesUpdate<'bots'>

export async function listBots() {
  const { data, error } = await supabase
    .from('bots')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createBot(payload: Omit<BotInsert, 'owner_id'>) {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Não autenticado.')

  const { data, error } = await supabase
    .from('bots')
    .insert({ ...payload, owner_id: userData.user.id })
    .select()
    .single()
  if (error) throw error

  return data
}

export async function updateBot(id: string, patch: BotUpdate) {
  const { data, error } = await supabase
    .from('bots')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBot(id: string) {
  const { error } = await supabase.from('bots').delete().eq('id', id)
  if (error) throw error
}
