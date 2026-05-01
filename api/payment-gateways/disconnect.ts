import { requireMethod, readJsonBody, sendError, withCors, type ApiRequest, type ApiResponse } from '../_lib/http.js'
import { requireUser, serviceSupabase } from '../_lib/supabase.js'
import { normalizeProvider } from '../_lib/paymentGateways.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (withCors(req, res)) return

  try {
    requireMethod(req, 'POST')
    const user = await requireUser(req)
    const { provider } = await readJsonBody<{ provider?: unknown }>(req)
    const normalizedProvider = normalizeProvider(provider)

    const { error } = await serviceSupabase
      .from('payment_gateway_connections')
      .delete()
      .eq('owner_id', user.id)
      .eq('provider', normalizedProvider)

    if (error) throw error

    res.status(200).json({ ok: true })
  } catch (error) {
    sendError(res, error)
  }
}
