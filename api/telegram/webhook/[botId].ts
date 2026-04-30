import { handleTelegramWebhook } from '../../_lib/flowExecutor.js'
import { getHeader, requireMethod, readJsonBody, sendError, withCors, type ApiRequest, type ApiResponse } from '../../_lib/http.js'
import { serviceSupabase } from '../../_lib/supabase.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (withCors(req, res)) return

  try {
    requireMethod(req, 'POST')
    const botId = getBotId(req)
    if (!botId) {
      res.status(400).json({ error: 'Bot ausente na URL do webhook.' })
      return
    }

    const { data: secret, error: secretError } = await serviceSupabase
      .from('bot_secrets')
      .select('telegram_token,webhook_secret')
      .eq('bot_id', botId)
      .maybeSingle()

    if (secretError) throw secretError
    if (!secret) {
      res.status(404).json({ error: 'Bot nao conectado.' })
      return
    }

    const telegramSecret = getHeader(req, 'x-telegram-bot-api-secret-token')
    if (!telegramSecret || telegramSecret !== secret.webhook_secret) {
      res.status(401).json({ error: 'Webhook nao autorizado.' })
      return
    }

    const update = await readJsonBody<Record<string, unknown>>(req)
    const result = await handleTelegramWebhook(botId, secret.telegram_token, update as never)

    res.status(200).json(result)
  } catch (error) {
    sendError(res, error)
  }
}

function getBotId(req: ApiRequest) {
  const queryValue = req.query?.botId
  if (Array.isArray(queryValue)) return queryValue[0]
  if (queryValue) return queryValue

  const url = req.url ?? ''
  const match = /\/api\/telegram\/webhook\/([^/?#]+)/.exec(url)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}
