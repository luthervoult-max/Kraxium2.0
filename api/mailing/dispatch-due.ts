import {
  getHeader,
  HttpError,
  sendError,
  withCors,
  type ApiRequest,
  type ApiResponse,
} from '../_lib/http.js'
import { dispatchDueMailings } from '../_lib/mailing.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (withCors(req, res)) return

  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      throw new HttpError(405, 'Metodo nao permitido.')
    }

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

    const result = await dispatchDueMailings()
    res.status(200).json(result)
  } catch (error) {
    sendError(res, error)
  }
}
