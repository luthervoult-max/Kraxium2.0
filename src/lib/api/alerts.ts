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

export interface AlertsReport {
  alerts: Alert[]
  errors: string[]
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, high: 1, medium: 2 }

export async function getAlertsReport(): Promise<AlertsReport> {
  const alerts: Alert[] = []
  const errors: string[] = []

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [botsResult, flowsResult, pixResult, remarketingResult, gatewayResult] =
    await Promise.allSettled([
      supabase
        .from('bots')
        .select(
          'id, name, connection_status, webhook_last_error, webhook_enabled, webhook_url, updated_at',
        ),
      supabase.from('flows').select('id, name, status, updated_at'),
      supabase
        .from('pix_payment_transactions')
        .select('id, status, created_at')
        .gte('created_at', sevenDaysAgo),
      supabase.from('remarketing_campaigns').select('id, name, status, failed_count, updated_at'),
      supabase.from('payment_gateway_connections').select('id, provider, status, updated_at'),
    ])

  const bots = getQueryData(botsResult, 'bots', errors)
  const flows = getQueryData(flowsResult, 'fluxos', errors)
  const pixPayments = getQueryData(pixResult, 'pagamentos Pix', errors)
  const remarketingCampaigns = getQueryData(remarketingResult, 'remarketing', errors)
  const gateways = getQueryData(gatewayResult, 'gateways', errors)

  if (bots.length > 0) {
    for (const bot of bots) {
      if (bot.connection_status !== 'connected') {
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
      if (bot.connection_status === 'connected' && !bot.webhook_enabled) {
        alerts.push({
          id: `bot-webhook-disabled-${bot.id}`,
          severity: 'medium',
          title: 'Webhook do bot desativado',
          description: `O bot "${bot.name}" está conectado, mas o webhook está desativado.`,
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

  if (flows.length > 0) {
    for (const flow of flows) {
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

  if (pixPayments.length > 0) {
    const failed = pixPayments.filter((p) => p.status === 'failed')
    const expired = pixPayments.filter((p) => p.status === 'expired')
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

  if (remarketingCampaigns.length > 0) {
    for (const campaign of remarketingCampaigns) {
      const failedCount = Number(campaign.failed_count ?? 0)
      if (campaign.status === 'failed') {
        alerts.push({
          id: `remarketing-failed-${campaign.id}`,
          severity: 'high',
          title: 'Campanha de remarketing com falha',
          description: `A campanha "${campaign.name}" está marcada como falha.`,
          createdAt: campaign.updated_at,
          page: 'remarketing',
          pageLabel: 'Remarketing',
        })
      } else if (failedCount > 0) {
        alerts.push({
          id: `remarketing-partial-${campaign.id}`,
          severity: 'medium',
          title: 'Campanha com falhas parciais',
          description: `A campanha "${campaign.name}" tem ${failedCount} mensagem(ns) com falha.`,
          createdAt: campaign.updated_at,
          page: 'remarketing',
          pageLabel: 'Remarketing',
        })
      }
    }
  }

  if (gateways.length > 0) {
    for (const gateway of gateways) {
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

  return { alerts: sortAlerts(alerts), errors }
}

export async function listAlerts(): Promise<Alert[]> {
  const report = await getAlertsReport()
  return report.alerts
}

export async function getAlertCount(): Promise<number> {
  const alerts = await listAlerts()
  return alerts.length
}

function sortAlerts(alerts: Alert[]) {
  return alerts.sort((a, b) => {
    const diff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    if (diff !== 0) return diff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

function getQueryData<T extends { [key: string]: unknown }>(
  result: PromiseSettledResult<{ data: T[] | null; error: { message?: string } | null }>,
  label: string,
  errors: string[],
): T[] {
  if (result.status === 'rejected') {
    errors.push(`${label}: ${normalizeQueryError(result.reason)}`)
    return []
  }

  if (result.value.error) {
    errors.push(`${label}: ${normalizeQueryError(result.value.error)}`)
    return []
  }

  return result.value.data ?? []
}

function normalizeQueryError(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? 'erro desconhecido')
  }
  return error instanceof Error ? error.message : 'erro desconhecido'
}
