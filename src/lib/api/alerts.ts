import { supabase } from '@/lib/supabase'
import type { Page } from '@/lib/pages'

export type AlertSeverity = 'critical' | 'high' | 'medium'

export interface Alert {
  id: string
  severity: AlertSeverity
  title: string
  description: string
  createdAt: string
  page?: Page
  pageLabel?: string
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, high: 1, medium: 2 }

export async function listAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = []

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [botsResult, flowsResult, pixResult, remarketingResult, gatewayResult] =
    await Promise.allSettled([
      supabase
        .from('bots')
        .select(
          'id, name, telegram_token, connection_status, webhook_last_error, webhook_enabled, webhook_url, updated_at',
        ),
      supabase.from('flows').select('id, name, status, updated_at'),
      supabase
        .from('pix_payment_transactions')
        .select('id, status, created_at')
        .gte('created_at', sevenDaysAgo),
      supabase.from('remarketing_campaigns').select('id, name, status, failed_count, updated_at'),
      supabase.from('payment_gateway_connections').select('id, provider, status, updated_at'),
    ])

  if (botsResult.status === 'fulfilled' && botsResult.value.data) {
    for (const bot of botsResult.value.data) {
      if (!bot.telegram_token) {
        alerts.push({
          id: `bot-no-token-${bot.id}`,
          severity: 'high',
          title: 'Bot sem token configurado',
          description: `O bot "${bot.name}" não tem token Telegram configurado.`,
          createdAt: bot.updated_at ?? new Date().toISOString(),
          page: 'bots',
          pageLabel: 'Bots',
        })
      } else if (bot.connection_status !== 'connected') {
        alerts.push({
          id: `bot-disconnected-${bot.id}`,
          severity: 'critical',
          title: 'Bot desconectado',
          description: `O bot "${bot.name}" não está conectado ao Telegram.`,
          createdAt: bot.updated_at ?? new Date().toISOString(),
          page: 'bots',
          pageLabel: 'Bots',
        })
      }
      if (bot.webhook_last_error) {
        alerts.push({
          id: `bot-webhook-error-${bot.id}`,
          severity: 'critical',
          title: 'Erro no webhook do bot',
          description: `Webhook de "${bot.name}": ${String(bot.webhook_last_error).slice(0, 90)}`,
          createdAt: bot.updated_at ?? new Date().toISOString(),
          page: 'bots',
          pageLabel: 'Bots',
        })
      }
      if (bot.webhook_enabled && !bot.webhook_url) {
        alerts.push({
          id: `bot-no-webhook-url-${bot.id}`,
          severity: 'high',
          title: 'Bot sem URL de webhook',
          description: `O bot "${bot.name}" tem webhook ativado mas sem URL configurada.`,
          createdAt: bot.updated_at ?? new Date().toISOString(),
          page: 'bots',
          pageLabel: 'Bots',
        })
      }
    }
  }

  if (flowsResult.status === 'fulfilled' && flowsResult.value.data) {
    for (const flow of flowsResult.value.data) {
      if (flow.status === 'error') {
        alerts.push({
          id: `flow-error-${flow.id}`,
          severity: 'critical',
          title: 'Fluxo com erro',
          description: `O fluxo "${flow.name}" está em estado de erro.`,
          createdAt: flow.updated_at ?? new Date().toISOString(),
          page: 'flows',
          pageLabel: 'Fluxos',
        })
      } else if (flow.status === 'paused') {
        alerts.push({
          id: `flow-paused-${flow.id}`,
          severity: 'medium',
          title: 'Fluxo pausado',
          description: `O fluxo "${flow.name}" está pausado.`,
          createdAt: flow.updated_at ?? new Date().toISOString(),
          page: 'flows',
          pageLabel: 'Fluxos',
        })
      }
    }
  }

  if (pixResult.status === 'fulfilled' && pixResult.value.data) {
    const failed = pixResult.value.data.filter((p) => p.status === 'failed')
    const expired = pixResult.value.data.filter((p) => p.status === 'expired')
    if (failed.length > 0) {
      alerts.push({
        id: 'pix-failed',
        severity: 'high',
        title: 'Pagamento(s) Pix falharam',
        description: `${failed.length} pagamento(s) Pix falharam nos últimos 7 dias.`,
        createdAt: failed[0].created_at,
        page: 'payments',
        pageLabel: 'Pagamentos',
      })
    }
    if (expired.length > 0) {
      alerts.push({
        id: 'pix-expired',
        severity: 'medium',
        title: 'Pagamento(s) Pix expiraram',
        description: `${expired.length} pagamento(s) Pix expiraram nos últimos 7 dias.`,
        createdAt: expired[0].created_at,
        page: 'payments',
        pageLabel: 'Pagamentos',
      })
    }
  }

  if (remarketingResult.status === 'fulfilled' && remarketingResult.value.data) {
    for (const campaign of remarketingResult.value.data) {
      if (campaign.status === 'failed') {
        alerts.push({
          id: `remarketing-failed-${campaign.id}`,
          severity: 'high',
          title: 'Campanha de remarketing falhou',
          description: `A campanha "${campaign.name}" falhou completamente.`,
          createdAt: campaign.updated_at,
          page: 'remarketing',
          pageLabel: 'Remarketing',
        })
      } else if (campaign.status === 'completed' && (campaign.failed_count ?? 0) > 0) {
        alerts.push({
          id: `remarketing-partial-${campaign.id}`,
          severity: 'medium',
          title: 'Campanha com falhas parciais',
          description: `A campanha "${campaign.name}" foi concluída com ${campaign.failed_count} falha(s).`,
          createdAt: campaign.updated_at,
          page: 'remarketing',
          pageLabel: 'Remarketing',
        })
      }
    }
  }

  if (gatewayResult.status === 'fulfilled' && gatewayResult.value.data) {
    for (const gateway of gatewayResult.value.data) {
      if (gateway.status !== 'connected') {
        alerts.push({
          id: `gateway-disconnected-${gateway.id}`,
          severity: 'critical',
          title: 'Gateway de pagamento desconectado',
          description: `O gateway "${gateway.provider}" não está conectado.`,
          createdAt: gateway.updated_at,
          page: 'payments',
          pageLabel: 'Pagamentos',
        })
      }
    }
  }

  return alerts.sort((a, b) => {
    const diff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    if (diff !== 0) return diff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export async function getAlertCount(): Promise<number> {
  const alerts = await listAlerts()
  return alerts.length
}
