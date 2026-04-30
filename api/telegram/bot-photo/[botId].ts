import { requireMethod, sendError, withCors, type ApiRequest, type ApiResponse } from '../../_lib/http.js'
import { requireUser, serviceSupabase } from '../../_lib/supabase.js'

interface TelegramProfilePhotosResponse {
  ok: boolean
  result?: {
    total_count: number
    photos: Array<Array<{ file_id: string; width: number; height: number; file_size?: number }>>
  }
  description?: string
}

interface TelegramFileResponse {
  ok: boolean
  result?: {
    file_id: string
    file_unique_id: string
    file_size?: number
    file_path?: string
  }
  description?: string
}

interface TelegramChatResponse {
  ok: boolean
  result?: {
    photo?: {
      small_file_id: string
      small_file_unique_id: string
      big_file_id: string
      big_file_unique_id: string
    }
  }
  description?: string
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (withCors(req, res)) return

  try {
    requireMethod(req, 'GET')
    const user = await requireUser(req)
    const botId = getBotId(req)

    if (!botId) {
      res.status(400).json({ error: 'Bot ausente na URL.' })
      return
    }

    const { data: bot, error: botError } = await serviceSupabase
      .from('bots')
      .select('id,owner_id,telegram_bot_id,telegram_username')
      .eq('id', botId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (botError) throw botError
    if (!bot?.telegram_bot_id) {
      res.status(404).json({ error: 'Bot sem dados do Telegram.' })
      return
    }

    const { data: secret, error: secretError } = await serviceSupabase
      .from('bot_secrets')
      .select('telegram_token')
      .eq('bot_id', bot.id)
      .maybeSingle()

    if (secretError) throw secretError
    if (!secret?.telegram_token) {
      res.status(404).json({ error: 'Token do bot nao encontrado.' })
      return
    }

    const photoFileId =
      (await getLargestProfilePhotoFileId(secret.telegram_token, bot.telegram_bot_id)) ??
      (await getChatPhotoFileId(secret.telegram_token, bot.telegram_username))

    if (!photoFileId) {
      res.status(204).end()
      return
    }

    const filePath = await getTelegramFilePath(secret.telegram_token, photoFileId)
    if (!filePath) {
      res.status(204).end()
      return
    }

    const fileResponse = await fetch(`https://api.telegram.org/file/bot${secret.telegram_token}/${filePath}`)
    if (!fileResponse.ok) {
      res.status(204).end()
      return
    }

    const contentType = fileResponse.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await fileResponse.arrayBuffer())

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.status(200)

    if (res.send) {
      res.send(buffer)
    } else {
      res.end(buffer)
    }
  } catch (error) {
    sendError(res, error)
  }
}

async function getLargestProfilePhotoFileId(token: string, userId: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/getUserProfilePhotos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: Number(userId), limit: 1 }),
  })

  const data = (await response.json().catch(() => null)) as TelegramProfilePhotosResponse | null
  const sizes = data?.ok ? data.result?.photos?.[0] : null

  if (!sizes?.length) return null

  return [...sizes].sort((left, right) => left.width * left.height - right.width * right.height).at(-1)?.file_id ?? null
}

async function getTelegramFilePath(token: string, fileId: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/getFile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  })

  const data = (await response.json().catch(() => null)) as TelegramFileResponse | null
  return data?.ok ? data.result?.file_path ?? null : null
}

async function getChatPhotoFileId(token: string, username?: string | null) {
  if (!username) return null

  const response = await fetch(`https://api.telegram.org/bot${token}/getChat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: `@${username}` }),
  })

  const data = (await response.json().catch(() => null)) as TelegramChatResponse | null
  return data?.ok ? data.result?.photo?.big_file_id ?? data.result?.photo?.small_file_id ?? null : null
}

function getBotId(req: ApiRequest) {
  const queryValue = req.query?.botId
  if (Array.isArray(queryValue)) return queryValue[0]
  if (queryValue) return queryValue

  const url = req.url ?? ''
  const match = /\/api\/telegram\/bot-photo\/([^/?#]+)/.exec(url)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}
