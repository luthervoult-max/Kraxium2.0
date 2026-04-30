import { deleteWebhook } from '../_lib/telegram.js'
import { HttpError, requireMethod, readJsonBody, sendError, withCors, type ApiRequest, type ApiResponse } from '../_lib/http.js'
import { requireUser, serviceSupabase } from '../_lib/supabase.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (withCors(req, res)) return

  try {
    requireMethod(req, 'POST')
    const user = await requireUser(req)
    const { botId } = await readJsonBody<{ botId?: string }>(req)

    if (!botId) {
      res.status(400).json({ error: 'botId e obrigatorio.' })
      return
    }

    const { data: bot, error: botError } = await serviceSupabase
      .from('bots')
      .select('id')
      .eq('id', botId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (botError) throw botError
    if (!bot) throw new HttpError(404, 'Bot nao encontrado.')

    const { data: secret } = await serviceSupabase
      .from('bot_secrets')
      .select('telegram_token')
      .eq('bot_id', bot.id)
      .maybeSingle()

    if (secret?.telegram_token) {
      await deleteWebhook(secret.telegram_token).catch(() => undefined)
    }

    const { error } = await serviceSupabase
      .from('bots')
      .delete()
      .eq('id', bot.id)
      .eq('owner_id', user.id)

    if (error) throw error

    res.status(200).json({ ok: true })
  } catch (error) {
    sendError(res, error)
  }
}
