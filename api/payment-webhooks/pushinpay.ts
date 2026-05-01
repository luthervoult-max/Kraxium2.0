import { continuePixTransactionById } from '../_lib/flowExecutor.js'
import { requireMethod, readJsonBody, sendError, withCors, type ApiRequest, type ApiResponse } from '../_lib/http.js'
import { applyPixWebhook } from '../_lib/pixPayments.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (withCors(req, res)) return

  try {
    requireMethod(req, 'POST')
    const payload = await readJsonBody(req)
    const result = await applyPixWebhook('pushinpay', payload)
    const continued = await continueIfNeeded(result)

    res.status(200).json({
      ok: true,
      provider: 'pushinpay',
      status: result.transaction?.status ?? null,
      transactionId: result.transaction?.id ?? null,
      continued,
    })
  } catch (error) {
    sendError(res, error)
  }
}

async function continueIfNeeded(result: Awaited<ReturnType<typeof applyPixWebhook>>) {
  if (!result.changed || !result.transaction) return false
  if (result.transaction.status === 'paid') {
    await continuePixTransactionById(result.transaction.id, 'paid')
    return true
  }
  if (['expired', 'canceled', 'failed'].includes(result.transaction.status)) {
    await continuePixTransactionById(result.transaction.id, 'unpaid')
    return true
  }
  return false
}
