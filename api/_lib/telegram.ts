import { HttpError } from './http.js'

export interface TelegramUser {
  id: number
  is_bot: boolean
  first_name: string
  username?: string
  can_join_groups?: boolean
  can_read_all_group_messages?: boolean
  supports_inline_queries?: boolean
}

interface TelegramResponse<T> {
  ok: boolean
  result?: T
  description?: string
  error_code?: number
  parameters?: { retry_after?: number; migrate_to_chat_id?: number }
}

export class TelegramApiError extends HttpError {
  telegramCode: number
  retryAfter: number | null

  constructor(statusCode: number, message: string, telegramCode: number, retryAfter: number | null) {
    super(statusCode, message)
    this.telegramCode = telegramCode
    this.retryAfter = retryAfter
  }
}

export type InlineKeyboardButton =
  | {
      text: string
      callback_data: string
    }
  | {
      text: string
      url: string
    }

async function telegramRequest<T>(
  token: string,
  method: string,
  payload?: Record<string, unknown>,
  attempt = 0,
): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  })

  const data = (await response.json().catch(() => null)) as TelegramResponse<T> | null

  if (!response.ok || !data?.ok) {
    const description = data?.description || `Telegram retornou HTTP ${response.status}.`
    const telegramCode = data?.error_code ?? response.status
    const retryAfter = data?.parameters?.retry_after ?? null

    if (telegramCode === 429 && retryAfter && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, (retryAfter + 0.2) * 1000))
      return telegramRequest<T>(token, method, payload, attempt + 1)
    }

    throw new TelegramApiError(
      response.status === 401 ? 401 : 400,
      description,
      telegramCode,
      retryAfter,
    )
  }

  return data.result as T
}

export function assertTelegramTokenShape(token: string) {
  if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token.trim())) {
    throw new HttpError(400, 'Token do Telegram invalido. Cole o token completo do BotFather.')
  }
}

export async function getMe(token: string) {
  assertTelegramTokenShape(token)
  const bot = await telegramRequest<TelegramUser>(token, 'getMe')

  if (!bot.is_bot) {
    throw new HttpError(400, 'Esse token nao pertence a um bot do Telegram.')
  }

  return bot
}

export async function setWebhook(token: string, webhookUrl: string, secretToken: string) {
  return telegramRequest<boolean>(token, 'setWebhook', {
    url: webhookUrl,
    allowed_updates: ['message', 'callback_query'],
    secret_token: secretToken,
    drop_pending_updates: false,
  })
}

export async function deleteWebhook(token: string) {
  return telegramRequest<boolean>(token, 'deleteWebhook', {
    drop_pending_updates: false,
  })
}

export async function sendMessage(
  token: string,
  chatId: string,
  text: string,
  keyboard?: InlineKeyboardButton[][],
  options: { parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2' } = {},
) {
  return telegramRequest(token, 'sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...(options.parseMode ? { parse_mode: options.parseMode } : {}),
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  })
}

export async function sendPhoto(
  token: string,
  chatId: string,
  photo: string,
  caption?: string,
) {
  return telegramRequest(token, 'sendPhoto', {
    chat_id: chatId,
    photo,
    ...(caption ? { caption } : {}),
  })
}

export async function sendVideo(
  token: string,
  chatId: string,
  video: string,
  caption?: string,
) {
  return telegramRequest(token, 'sendVideo', {
    chat_id: chatId,
    video,
    ...(caption ? { caption } : {}),
  })
}

export async function sendAudio(
  token: string,
  chatId: string,
  audio: string,
  caption?: string,
) {
  return telegramRequest(token, 'sendAudio', {
    chat_id: chatId,
    audio,
    ...(caption ? { caption } : {}),
  })
}

export async function sendVoice(
  token: string,
  chatId: string,
  voice: string,
) {
  return telegramRequest(token, 'sendVoice', {
    chat_id: chatId,
    voice,
  })
}

export async function sendChatAction(token: string, chatId: string, action: string) {
  return telegramRequest(token, 'sendChatAction', {
    chat_id: chatId,
    action,
  })
}

export async function answerCallbackQuery(
  token: string,
  callbackQueryId: string,
  options: { text?: string; showAlert?: boolean } = {},
) {
  return telegramRequest(token, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...(options.text ? { text: options.text } : {}),
    ...(options.showAlert ? { show_alert: true } : {}),
  })
}
