import { requireMethod, readJsonBody, sendError, withCors, type ApiRequest, type ApiResponse } from '../_lib/http.js'
import { requireUser } from '../_lib/supabase.js'
import { previewRemarketingAudience } from '../_lib/remarketing.js'

interface PreviewBody {
  filters?: unknown
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (withCors(req, res)) return

  try {
    requireMethod(req, 'POST')
    const user = await requireUser(req)
    const body = await readJsonBody<PreviewBody>(req)
    const preview = await previewRemarketingAudience(user.id, body.filters)
    res.status(200).json(preview)
  } catch (error) {
    sendError(res, error)
  }
}
