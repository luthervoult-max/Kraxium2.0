import { getMe } from '../_lib/telegram.js'
import { requireMethod, readJsonBody, sendError, withCors, type ApiRequest, type ApiResponse } from '../_lib/http.js'
import { requireUser } from '../_lib/supabase.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (withCors(req, res)) return

  try {
    requireMethod(req, 'POST')
    await requireUser(req)

    const { token } = await readJsonBody<{ token?: string }>(req)
    const bot = await getMe(String(token ?? '').trim())

    res.status(200).json({
      bot: {
        telegram_bot_id: String(bot.id),
        first_name: bot.first_name,
        username: bot.username ?? null,
        can_join_groups: bot.can_join_groups ?? null,
        can_read_all_group_messages: bot.can_read_all_group_messages ?? null,
        supports_inline_queries: bot.supports_inline_queries ?? null,
      },
    })
  } catch (error) {
    sendError(res, error)
  }
}
