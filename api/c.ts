import {
  HttpError,
  sendError,
  withCors,
  type ApiRequest,
  type ApiResponse,
} from './_lib/http.js'
import { serviceSupabase } from './_lib/supabase.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (withCors(req, res)) return

  try {
    if (req.method !== 'GET') throw new HttpError(405, 'Metodo nao permitido.')

    const url = new URL(req.url ?? '', 'http://localhost')
    const token = url.searchParams.get('t')?.trim()
    if (!token) throw new HttpError(400, 'Link invalido.')

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
  } catch (error) {
    sendError(res, error)
  }
}
