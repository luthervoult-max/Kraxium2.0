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
  listRemarketingDashboard,
  previewRemarketingAudience,
  saveRemarketingCampaign,
  sendRemarketingBatch,
  type SaveRemarketingInput,
} from '../_lib/remarketing.js'

type RemarketingActionBody =
  | ({ action: 'preview'; filters?: unknown } & Record<string, unknown>)
  | ({ action: 'save' } & SaveRemarketingInput)
  | ({ action: 'send'; campaignId?: unknown; confirm?: unknown } & Record<string, unknown>)

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (withCors(req, res)) return

  try {
    const user = await requireUser(req)

    if (req.method === 'GET') {
      const dashboard = await listRemarketingDashboard(user.id)
      res.status(200).json(dashboard)
      return
    }

    if (req.method !== 'POST') {
      throw new HttpError(405, 'Metodo nao permitido.')
    }

    const body = await readJsonBody<RemarketingActionBody>(req)

    if (body.action === 'preview') {
      const preview = await previewRemarketingAudience(user.id, body.filters)
      res.status(200).json(preview)
      return
    }

    if (body.action === 'save') {
      const campaign = await saveRemarketingCampaign(user.id, body)
      res.status(200).json({ campaign })
      return
    }

    if (body.action === 'send') {
      const campaign = await sendRemarketingBatch(user.id, body.campaignId, body.confirm)
      res.status(200).json({ campaign })
      return
    }

    throw new HttpError(400, 'Acao de remarketing invalida.')
  } catch (error) {
    sendError(res, error)
  }
}
