import {
  HttpError,
  readJsonBody,
  sendError,
  withCors,
  type ApiRequest,
  type ApiResponse,
} from '../_lib/http.js'
import { requireUser } from '../_lib/supabase.js'
import {
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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (withCors(req, res)) return

  try {
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
