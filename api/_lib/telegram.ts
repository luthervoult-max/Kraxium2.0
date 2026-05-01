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
}

export interface InlineKeyboardButton {
  text: string
  callback_data: string
}

async function telegramRequest<T>(
  token: string,
  method: string,
  payload?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  })

  const data = (await response.json().catch(() => null)) as TelegramResponse<T> | null

  if (!response.ok || !data?.ok) {
    const description = data?.description || `Telegram retornou HTTP ${response.status}.`
    throw new HttpError(response.status === 401 ? 401 : 400, description)
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
