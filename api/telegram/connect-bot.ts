import { randomBytes } from 'node:crypto'
import { getMe, setWebhook } from '../_lib/telegram.js'
import { requireMethod, readJsonBody, sendError, withCors, type ApiRequest, type ApiResponse } from '../_lib/http.js'
import { requireUser, serviceSupabase } from '../_lib/supabase.js'

const botPublicColumns = `
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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (withCors(req, res)) return

  try {
    requireMethod(req, 'POST')
    const user = await requireUser(req)
    const { token } = await readJsonBody<{ token?: string }>(req)
    const telegramToken = String(token ?? '').trim()
    const telegramBot = await getMe(telegramToken)
    const webhookSecret = randomBytes(24).toString('hex')

    const { data: bot, error: upsertError } = await serviceSupabase
      .from('bots')
      .upsert(
        {
          owner_id: user.id,
          name: telegramBot.first_name || telegramBot.username || 'Bot Telegram',
          telegram_bot_id: String(telegramBot.id),
          telegram_username: telegramBot.username ?? null,
          telegram_first_name: telegramBot.first_name,
          telegram_can_join_groups: telegramBot.can_join_groups ?? null,
          telegram_can_read_all_group_messages: telegramBot.can_read_all_group_messages ?? null,
          telegram_supports_inline_queries: telegramBot.supports_inline_queries ?? null,
          telegram_token: null,
          notifications_enabled: true,
          webhook_enabled: false,
          connection_status: 'inactive',
          webhook_last_error: null,
        },
        { onConflict: 'owner_id,telegram_bot_id' },
      )
      .select('id')
      .single()

    if (upsertError) throw upsertError

    const webhookUrl = `${getWebhookBaseUrl()}/api/telegram/webhook/${bot.id}`

    const { error: secretError } = await serviceSupabase
      .from('bot_secrets')
      .upsert({
        bot_id: bot.id,
        telegram_token: telegramToken,
        webhook_secret: webhookSecret,
      })

    if (secretError) throw secretError

    try {
      await setWebhook(telegramToken, webhookUrl, webhookSecret)
    } catch (error) {
      await serviceSupabase
        .from('bots')
        .update({
          connection_status: 'error',
          webhook_enabled: false,
          webhook_url: webhookUrl,
          webhook_last_error: error instanceof Error ? error.message : 'Falha ao registrar webhook.',
        })
        .eq('id', bot.id)
      throw error
    }

    const { data: connectedBot, error: updateError } = await serviceSupabase
      .from('bots')
      .update({
        webhook_enabled: true,
        webhook_url: webhookUrl,
        connection_status: 'active',
        connected_at: new Date().toISOString(),
        webhook_last_error: null,
      })
      .eq('id', bot.id)
      .eq('owner_id', user.id)
      .select(botPublicColumns)
      .single()

    if (updateError) throw updateError

    res.status(200).json({ bot: connectedBot })
  } catch (error) {
    sendError(res, error)
  }
}

function getWebhookBaseUrl() {
  const configured = process.env.TELEGRAM_WEBHOOK_BASE_URL?.trim()
  if (configured) return configured.replace(/\/+$/, '')

  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) return `https://${vercelUrl.replace(/\/+$/, '')}`

  return 'https://project-1dlso.vercel.app'
}
