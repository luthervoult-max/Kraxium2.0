import { requireMethod, sendError, withCors, type ApiRequest, type ApiResponse } from '../_lib/http.js'
import { requireUser, serviceSupabase } from '../_lib/supabase.js'
import { toPublicConnection, type PaymentGatewayRow } from '../_lib/paymentGateways.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (withCors(req, res)) return

  try {
    requireMethod(req, 'GET')
    const user = await requireUser(req)

    const { data, error } = await serviceSupabase
      .from('payment_gateway_connections')
      .select(
        `
        id,
        owner_id,
        provider,
        status,
        scope,
        flow_ids,
        public_config,
        credentials_encrypted,
        credentials_hint,
        created_at,
        updated_at
      `,
      )
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) throw error

    res.status(200).json({
      connections: ((data ?? []) as PaymentGatewayRow[]).map(toPublicConnection),
    })
  } catch (error) {
    sendError(res, error)
  }
}
