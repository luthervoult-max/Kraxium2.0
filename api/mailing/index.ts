import {
  getHeader,
  HttpError,
  readJsonBody,
  sendError,
  withCors,
  type ApiRequest,
  type ApiResponse,
} from '../_lib/http.js'
import { requireUser, serviceSupabase } from '../_lib/supabase.js'
import {
  controlMailingCampaign,
  dispatchDueMailings,
  listMailingDashboard,
  previewMailingAudience,
  saveMailingCampaign,
  sendMailingBatch,
  type SaveMailingInput,
} from '../_lib/mailing.js'

type MailingActionBody =
  | ({ action: 'preview'; filters?: unknown; message?: unknown } & Record<string, unknown>)
  | ({ action: 'save' } & SaveMailingInput)
  | ({ action: 'send'; campaignId?: unknown; confirm?: unknown } & Record<string, unknown>)
  | ({ action: 'pause' | 'resume' | 'cancel'; campaignId?: unknown } & Record<string, unknown>)

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (withCors(req, res)) return

  try {
    const clickToken = getQueryValue(req, 'click')?.trim()
    if (clickToken) {
      await handleClickRedirect(req, res, clickToken)
      return
    }

    if (getQueryValue(req, 'dispatchDue') === '1') {
      requireCronSecret(req)
      const result = await dispatchDueMailings()
      res.status(200).json(result)
      return
    }

    const user = await requireUser(req)

    if (req.method === 'GET') {
      const dashboard = await listMailingDashboard(user.id, getQueryValue(req, 'botId'))
      res.status(200).json(dashboard)
      return
    }

    if (req.method !== 'POST') {
      throw new HttpError(405, 'Metodo nao permitido.')
    }

    const body = await readJsonBody<MailingActionBody>(req)

    if (body.action === 'preview') {
      const preview = await previewMailingAudience(user.id, body.filters, body.message)
      res.status(200).json(preview)
      return
    }

    if (body.action === 'save') {
      const campaign = await saveMailingCampaign(user.id, body)
      res.status(200).json({ campaign })
      return
    }

    if (body.action === 'send') {
      const campaign = await sendMailingBatch(user.id, body.campaignId, body.confirm)
      res.status(200).json({ campaign })
      return
    }

    if (body.action === 'pause' || body.action === 'resume' || body.action === 'cancel') {
      const campaign = await controlMailingCampaign(user.id, body.campaignId, body.action)
      res.status(200).json({ campaign })
      return
    }

    throw new HttpError(400, 'Acao de mailing invalida.')
  } catch (error) {
    sendError(res, error)
  }
}

function getQueryValue(req: ApiRequest, key: string) {
  const fromQuery = req.query?.[key]
  if (Array.isArray(fromQuery)) return fromQuery[0]
  if (fromQuery) return fromQuery

  if (!req.url) return undefined
  const url = new URL(req.url, 'http://localhost')
  return url.searchParams.get(key) ?? undefined
}

async function handleClickRedirect(req: ApiRequest, res: ApiResponse, token: string) {
  if (req.method !== 'GET') throw new HttpError(405, 'Metodo nao permitido.')

  const { data, error } = await serviceSupabase
    .from('mailing_link_clicks')
    .select('destination_url, click_count')
    .eq('token', token)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new HttpError(404, 'Link expirado.')

  await serviceSupabase
    .from('mailing_link_clicks')
    .update({
      click_count: (data.click_count ?? 0) + 1,
      last_clicked_at: new Date().toISOString(),
    })
    .eq('token', token)

  res.setHeader('Location', data.destination_url)
  res.status(302).end()
}

function requireCronSecret(req: ApiRequest) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    throw new HttpError(500, 'CRON_SECRET nao configurado.')
  }

  const authorization = getHeader(req, 'authorization') ?? ''
  const cronHeader = getHeader(req, 'x-cron-secret') ?? ''
  const provided = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : cronHeader

  if (provided !== expected) {
    throw new HttpError(401, 'Execucao nao autorizada.')
  }
}
