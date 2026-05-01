import { requireMethod, sendError, withCors, type ApiRequest, type ApiResponse } from '../_lib/http.js'
import { requireUser } from '../_lib/supabase.js'
import { listRemarketingDashboard } from '../_lib/remarketing.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (withCors(req, res)) return

  try {
    requireMethod(req, 'GET')
    const user = await requireUser(req)
    const dashboard = await listRemarketingDashboard(user.id)
    res.status(200).json(dashboard)
  } catch (error) {
    sendError(res, error)
  }
}
