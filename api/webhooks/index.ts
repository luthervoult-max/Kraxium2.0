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
  deleteWebhookSubscription,
  getWebhookCatalog,
  listWebhookSubscriptions,
  saveWebhookSubscription,
  sendWebhookTest,
  updateWebhookSubscriptionStatus,
} from '../_lib/outboundWebhooks.js'

type WebhookActionBody =
  | { action?: 'save'; eventType?: unknown; targetUrl?: unknown }
  | { action?: 'pause' | 'resume' | 'delete' | 'test'; eventType?: unknown }

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (withCors(req, res)) return

  try {
    const user = await requireUser(req)

    if (req.method === 'GET') {
      const subscriptions = await listWebhookSubscriptions(user.id)
      res.status(200).json({
        events: getWebhookCatalog(),
        subscriptions,
        summary: buildSummary(subscriptions),
      })
      return
    }

    if (req.method !== 'POST') {
      throw new HttpError(405, 'Metodo nao permitido.')
    }

    const body = await readJsonBody<WebhookActionBody>(req)

    if (body.action === 'save') {
      const subscription = await saveWebhookSubscription({
        ownerId: user.id,
        eventType: body.eventType,
        targetUrl: body.targetUrl,
      })
      res.status(200).json({ subscription })
      return
    }

    if (body.action === 'pause' || body.action === 'resume') {
      const subscription = await updateWebhookSubscriptionStatus({
        ownerId: user.id,
        eventType: body.eventType,
        status: body.action === 'pause' ? 'paused' : 'active',
      })
      res.status(200).json({ subscription })
      return
    }

    if (body.action === 'delete') {
      await deleteWebhookSubscription(user.id, body.eventType)
      res.status(200).json({ ok: true })
      return
    }

    if (body.action === 'test') {
      const delivery = await sendWebhookTest(user.id, body.eventType)
      const subscriptions = await listWebhookSubscriptions(user.id)
      res.status(200).json({ delivery, subscriptions, summary: buildSummary(subscriptions) })
      return
    }

    throw new HttpError(400, 'Acao de webhook invalida.')
  } catch (error) {
    sendError(res, error)
  }
}

function buildSummary(
  subscriptions: Array<{
    status: 'active' | 'paused' | 'error'
  }>,
) {
  return {
    active: subscriptions.filter((subscription) => subscription.status === 'active').length,
    configured: subscriptions.length,
    available: getWebhookCatalog().length,
  }
}
