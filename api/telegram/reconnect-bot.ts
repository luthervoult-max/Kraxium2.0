import { randomBytes } from 'node:crypto'
import { setWebhook } from '../_lib/telegram.js'
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
    const { botId } = await readJsonBody<{ botId?: string }>(req)

    if (!botId) {
      res.status(400).json({ error: 'botId ausente no corpo da requisição.' })
      return
    }

    const { data: bot, error: botError } = await serviceSupabase
      .from('bots')
      .select('id,owner_id')
      .eq('id', botId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (botError) throw botError
    if (!bot) {
      res.status(404).json({ error: 'Bot não encontrado.' })
      return
    }

    const { data: secret, error: secretError } = await serviceSupabase
      .from('bot_secrets')
      .select('telegram_token')
      .eq('bot_id', bot.id)
      .maybeSingle()

    if (secretError) throw secretError
    if (!secret?.telegram_token) {
      res.status(404).json({ error: 'Token do bot não encontrado.' })
      return
    }

    const webhookSecret = randomBytes(24).toString('hex')
    const webhookUrl = `${getWebhookBaseUrl()}/api/telegram/webhook/${bot.id}`

    const { error: updateSecretError } = await serviceSupabase
      .from('bot_secrets')
      .update({ webhook_secret: webhookSecret })
      .eq('bot_id', bot.id)

    if (updateSecretError) throw updateSecretError

    try {
      await setWebhook(secret.telegram_token, webhookUrl, webhookSecret)
    } catch (error) {
      await serviceSupabase
        .from('bots')
        .update({
          connection_status: 'error',
          webhook_enabled: false,
          webhook_last_error: error instanceof Error ? error.message : 'Falha ao re-registrar webhook.',
        })
        .eq('id', bot.id)
      throw error
    }

    const { data: updatedBot, error: updateError } = await serviceSupabase
      .from('bots')
      .update({
        webhook_enabled: true,
        webhook_url: webhookUrl,
        connection_status: 'active',
        webhook_last_error: null,
      })
      .eq('id', bot.id)
      .eq('owner_id', user.id)
      .select(botPublicColumns)
      .single()

    if (updateError) throw updateError

    res.status(200).json({ bot: updatedBot })
  } catch (error) {
    sendError(res, error)
  }
}

function getWebhookBaseUrl() {
  const configured = process.env.TELEGRAM_WEBHOOK_BASE_URL?.trim()
  if (configured) return configured.replace(/\/+$/, '')

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (vercelProd) return `https://${vercelProd.replace(/\/+$/, '')}`

  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) return `https://${vercelUrl.replace(/\/+$/, '')}`

  return ''
}
