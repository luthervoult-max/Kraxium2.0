import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'

export type Bot = Tables<'bots'>
export type BotInsert = TablesInsert<'bots'>
export type BotUpdate = TablesUpdate<'bots'>

export interface TelegramBotPreview {
  telegram_bot_id: string
  first_name: string
  username: string | null
  can_join_groups: boolean | null
  can_read_all_group_messages: boolean | null
  supports_inline_queries: boolean | null
}

const botPublicSelect = `
  id,
  owner_id,
  name,
  notifications_enabled,
  webhook_enabled,
  webhook_url,
  created_at,
  updated_at,
  telegram_bot_id,
  telegram_username,
  telegram_first_name,
  telegram_can_join_groups,
  telegram_can_read_all_group_messages,
  telegram_supports_inline_queries,
  connection_status,
  connected_at,
  last_update_at,
  webhook_last_error
`

export async function listBots() {
  const { data, error } = await supabase
    .from('bots')
    .select(botPublicSelect)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((bot) => ({ ...bot, telegram_token: null })) as Bot[]
}

export async function createBot(payload: Omit<BotInsert, 'owner_id'>) {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Não autenticado.')

  const { telegram_token: _telegramToken, ...safePayload } = payload

  const { data, error } = await supabase
    .from('bots')
    .insert({ ...safePayload, owner_id: userData.user.id })
    .select()
    .single()
  if (error) throw error

  return data
}

export async function updateBot(id: string, patch: BotUpdate) {
  const { telegram_token: _telegramToken, ...safePatch } = patch
  const { data, error } = await supabase
    .from('bots')
    .update(safePatch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBot(id: string) {
  await telegramApiFetch('/api/telegram/delete-bot', {
    method: 'POST',
    body: JSON.stringify({ botId: id }),
  })
}

export async function validateTelegramBotToken(token: string) {
  const data = await telegramApiFetch<{ bot: TelegramBotPreview }>('/api/telegram/validate-bot', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })

  return data.bot
}

export async function connectTelegramBot(token: string) {
  const data = await telegramApiFetch<{ bot: Bot }>('/api/telegram/connect-bot', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })

  return { ...data.bot, telegram_token: null } as Bot
}

export async function fetchTelegramBotPhotoUrl(botId: string) {
  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token

  if (!accessToken) {
    throw new Error('Voce precisa estar logado para carregar a foto do bot.')
  }

  const response = await fetch(`${getTelegramApiBaseUrl()}/api/telegram/bot-photo/${botId}`, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (response.status === 204 || response.status === 404) {
    return null
  }

  if (!response.ok) {
    return null
  }

  const blob = await response.blob()
  if (blob.size === 0) return null

  return URL.createObjectURL(blob)
}

async function telegramApiFetch<T = unknown>(path: string, init: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token

  if (!accessToken) {
    throw new Error('Voce precisa estar logado para conectar bots.')
  }

  const response = await fetch(`${getTelegramApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
  })

  const payload = (await response.json().catch(() => null)) as { error?: string } | T | null

  if (!response.ok) {
    throw new Error(
      payload && typeof payload === 'object' && 'error' in payload && payload.error
        ? payload.error
        : 'Falha ao chamar a API do Telegram.',
    )
  }

  return payload as T
}

function getTelegramApiBaseUrl() {
  const configured = import.meta.env.VITE_TELEGRAM_API_BASE_URL?.trim()
  if (configured) return configured.replace(/\/+$/, '')

  return ''
}
