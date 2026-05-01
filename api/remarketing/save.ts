import { requireMethod, readJsonBody, sendError, withCors, type ApiRequest, type ApiResponse } from '../_lib/http.js'
import { requireUser } from '../_lib/supabase.js'
import { saveRemarketingCampaign, type SaveRemarketingInput } from '../_lib/remarketing.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (withCors(req, res)) return

  try {
    requireMethod(req, 'POST')
    const user = await requireUser(req)
    const body = await readJsonBody<SaveRemarketingInput>(req)
    const campaign = await saveRemarketingCampaign(user.id, body)
    res.status(200).json({ campaign })
  } catch (error) {
    sendError(res, error)
  }
}
