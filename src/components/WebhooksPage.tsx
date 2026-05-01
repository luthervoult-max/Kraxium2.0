import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  CreditCard,
  Info,
  Loader2,
  Pause,
  Play,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Smartphone,
  Trash2,
  Webhook,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  deleteWebhook,
  listWebhooksDashboard,
  pauseWebhook,
  resumeWebhook,
  saveWebhook,
  testWebhook,
  type WebhookSubscription,
  type WebhooksDashboard,
} from '@/lib/api/webhooks'
import {
  WEBHOOK_EVENT_CATALOG,
  type WebhookEventDefinition,
  type WebhookEventType,
} from '@/lib/webhookEvents'
import { cn } from '@/lib/utils'

const EVENT_ICONS: Record<WebhookEventDefinition['iconKey'], LucideIcon> = {
  card: CreditCard,
  warning: AlertTriangle,
  bot: Bot,
  zap: Zap,
  check: CheckCircle2,
}

const SEVERITY_META: Record<
  WebhookEventDefinition['severity'],
  { label: string; className: string; dot: string }
> = {
  success: {
    label: 'sucesso',
    className: 'border-neon-green/25 bg-neon-green/10 text-neon-green',
    dot: 'bg-neon-green',
  },
  info: {
    label: 'evento',
    className: 'border-neon-purple/25 bg-neon-purple/10 text-neon-purple',
    dot: 'bg-neon-purple',
  },
  warning: {
    label: 'atenção',
    className: 'border-neon-orange/30 bg-neon-orange/10 text-neon-orange',
    dot: 'bg-neon-orange',
  },
  critical: {
    label: 'crítico',
    className: 'border-red-500/30 bg-red-500/10 text-red-300',
    dot: 'bg-red-400',
  },
}

export default function WebhooksPage() {
  const [dashboard, setDashboard] = useState<WebhooksDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeEvent, setActiveEvent] = useState<WebhookEventDefinition | null>(null)
  const [savingEventType, setSavingEventType] = useState<WebhookEventType | null>(null)
  const [testingEventType, setTestingEventType] = useState<WebhookEventType | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    void loadDashboard()
  }, [])

  const subscriptionMap = useMemo(() => {
    return new Map((dashboard?.subscriptions ?? []).map((item) => [item.eventType, item]))
  }, [dashboard?.subscriptions])

  async function loadDashboard() {
    setLoading(true)
    setError(null)
    try {
      const data = await listWebhooksDashboard()
      setDashboard(data)
    } catch (err) {
      setError(normalizeError(err))
    } finally {
      setLoading(false)
    }
  }

  function updateSubscription(subscription: WebhookSubscription) {
    setDashboard((current) => {
      if (!current) return current
      const subscriptions = [
        subscription,
        ...current.subscriptions.filter((item) => item.eventType !== subscription.eventType),
      ]
      return {
        ...current,
        subscriptions,
        summary: buildSummary(current.events.length, subscriptions),
      }
    })
  }

  function removeSubscription(eventType: WebhookEventType) {
    setDashboard((current) => {
      if (!current) return current
      const subscriptions = current.subscriptions.filter((item) => item.eventType !== eventType)
      return {
        ...current,
        subscriptions,
        summary: buildSummary(current.events.length, subscriptions),
      }
    })
  }

  async function handleSave(eventType: WebhookEventType, targetUrl: string) {
    setSavingEventType(eventType)
    setNotice(null)
    try {
      const subscription = await saveWebhook(eventType, targetUrl)
      updateSubscription(subscription)
      setActiveEvent(null)
      setNotice('Webhook salvo e ativado.')
    } finally {
      setSavingEventType(null)
    }
  }

  async function handlePause(eventType: WebhookEventType) {
    setSavingEventType(eventType)
    setNotice(null)
    try {
      const subscription = await pauseWebhook(eventType)
      updateSubscription(subscription)
      setNotice('Webhook pausado.')
    } finally {
      setSavingEventType(null)
    }
  }

  async function handleResume(eventType: WebhookEventType) {
    setSavingEventType(eventType)
    setNotice(null)
    try {
      const subscription = await resumeWebhook(eventType)
      updateSubscription(subscription)
      setNotice('Webhook reativado.')
    } finally {
      setSavingEventType(null)
    }
  }

  async function handleDelete(eventType: WebhookEventType) {
    setSavingEventType(eventType)
    setNotice(null)
    try {
      await deleteWebhook(eventType)
      removeSubscription(eventType)
      setNotice('Webhook removido.')
    } finally {
      setSavingEventType(null)
    }
  }

  async function handleTest(eventType: WebhookEventType) {
    setTestingEventType(eventType)
    setNotice(null)
    try {
      const data = await testWebhook(eventType)
      setDashboard((current) =>
        current
          ? {
              ...current,
              subscriptions: data.subscriptions,
              summary: data.summary,
            }
          : current,
      )
      setNotice(
        data.delivery.status === 'success'
          ? 'Teste enviado com sucesso.'
          : `Teste enviado, mas o destino respondeu com falha: ${data.delivery.errorMessage ?? 'erro desconhecido'}`,
      )
    } finally {
      setTestingEventType(null)
    }
  }

  const events = dashboard?.events ?? WEBHOOK_EVENT_CATALOG
  const summary = dashboard?.summary ?? { active: 0, configured: 0, available: events.length }

  return (
    <main className="space-y-7 p-6">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-neon-purple">
            Integrações
          </p>
          <h2 className="mt-2 text-4xl font-black tracking-tight text-white">Webhooks</h2>
          <p className="mt-2 max-w-3xl border-l border-white/10 pl-4 text-base leading-6 text-gray-500">
            Ative notificações via webhook para receber alertas em tempo real no celular,
            n8n, Make, Zapier ou qualquer endpoint HTTPS.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={loading}
          className="h-11 rounded-full border border-neon-purple/35 bg-neon-purple/15 px-5 font-black text-neon-purple hover:bg-neon-purple/20"
        >
          {loading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Zap size={16} className="mr-2" />}
          Atualizar
        </Button>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SummaryCard icon={Zap} label="Webhooks Ativos" value={summary.active} />
        <SummaryCard icon={Settings} label="Configurados" value={summary.configured} />
        <SummaryCard icon={Webhook} label="Disponíveis" value={summary.available || events.length || 6} />
      </section>

      {(error || notice) && (
        <div
          className={cn(
            'rounded-[16px] border px-4 py-3 text-sm font-bold leading-6',
            error
              ? 'border-neon-orange/30 bg-neon-orange/10 text-neon-orange'
              : 'border-neon-green/25 bg-neon-green/10 text-neon-green',
          )}
        >
          {error ?? notice}
        </div>
      )}

      <section className="rounded-[22px] border border-neon-purple/20 bg-[radial-gradient(circle_at_10%_20%,rgba(180,77,255,0.16),transparent_34%),#0c0d10] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] border border-neon-purple/30 bg-neon-purple/15 text-neon-purple shadow-[0_0_24px_rgba(180,77,255,0.18)]">
            <Smartphone size={30} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-2xl font-black text-white">
              Receba alertas no celular via Webhook
            </h3>
            <p className="mt-3 text-base leading-7 text-gray-400">
              Use PushCut para push no celular, ou conecte n8n, Make e Zapier para criar rotinas
              automáticas. Quando ocorrer um evento importante, a Kraxium envia um JSON seguro
              para a URL configurada.
            </p>

            <div className="mt-5 rounded-[16px] border border-white/10 bg-white/[0.025] px-4 py-4 text-sm leading-6 text-gray-400">
              <Info size={18} className="mr-2 inline text-neon-purple" aria-hidden="true" />
              O webhook serve para você agir rápido: trocar gateway instável, recuperar venda
              perdida, saber quando o bot falhou e comemorar venda aprovada sem ficar olhando o
              painel o tempo todo.
            </div>

            <div className="mt-5 space-y-3">
              <InstructionStep
                number={1}
                title="Crie uma notificação"
                text="No PushCut ou ferramenta escolhida, crie uma nova notificação e defina o texto que quer receber."
              />
              <InstructionStep
                number={2}
                title="Copie a URL do Webhook"
                text="Copie a URL gerada pela ferramenta externa. Ela normalmente já vem com o token de segurança."
              />
              <InstructionStep
                number={3}
                title="Cole a URL no evento"
                text="Abra um card abaixo, cole a URL HTTPS e use Enviar teste para confirmar."
              />
            </div>

            <div className="mt-5 rounded-[14px] border border-neon-orange/30 bg-neon-orange/10 px-4 py-3 text-sm font-bold leading-6 text-neon-orange">
              Importante: cada evento deve ter uma URL diferente para você saber exatamente o que
              aconteceu quando a notificação chegar.
            </div>
          </div>
        </div>
      </section>

      {loading && !dashboard ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-[18px] border border-white/10 bg-[#0c0d10] text-gray-500">
          <Loader2 size={22} className="mr-3 animate-spin" aria-hidden="true" />
          Carregando webhooks...
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {events.map((event) => (
            <WebhookEventCard
              key={event.type}
              event={event}
              subscription={subscriptionMap.get(event.type) ?? null}
              busy={savingEventType === event.type}
              testing={testingEventType === event.type}
              onConfigure={() => setActiveEvent(event)}
              onPause={() => void handlePause(event.type)}
              onResume={() => void handleResume(event.type)}
              onDelete={() => void handleDelete(event.type)}
              onTest={() => void handleTest(event.type)}
            />
          ))}
        </section>
      )}

      {activeEvent && (
        <WebhookConfigModal
          event={activeEvent}
          subscription={subscriptionMap.get(activeEvent.type) ?? null}
          saving={savingEventType === activeEvent.type}
          onClose={() => setActiveEvent(null)}
          onSave={handleSave}
        />
      )}
    </main>
  )
}

function SummaryCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <article className="rounded-[18px] border border-white/10 bg-[#0c0d10] p-5">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-[15px] border border-neon-purple/30 bg-neon-purple/15 text-neon-purple">
          <Icon size={23} aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-bold text-gray-500">{label}</p>
          <p className="mt-1 text-4xl font-black text-white">{value}</p>
        </div>
      </div>
    </article>
  )
}

function InstructionStep({ number, title, text }: { number: number; title: string; text: string }) {
  return (
    <div className="flex gap-4 rounded-[14px] border border-white/10 bg-[#08090b]/80 px-4 py-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-neon-purple text-sm font-black text-white">
        {number}
      </span>
      <div>
        <h4 className="text-sm font-black text-white">{title}</h4>
        <p className="mt-1 text-sm leading-6 text-gray-500">{text}</p>
      </div>
    </div>
  )
}

function WebhookEventCard({
  event,
  subscription,
  busy,
  testing,
  onConfigure,
  onPause,
  onResume,
  onDelete,
  onTest,
}: {
  event: WebhookEventDefinition
  subscription: WebhookSubscription | null
  busy: boolean
  testing: boolean
  onConfigure: () => void
  onPause: () => void
  onResume: () => void
  onDelete: () => void
  onTest: () => void
}) {
  const Icon = EVENT_ICONS[event.iconKey]
  const severity = SEVERITY_META[event.severity]
  const status = getSubscriptionStatus(subscription)

  return (
    <article className="flex min-h-[360px] flex-col rounded-[22px] border border-white/10 bg-[#0c0d10] p-6 transition-colors hover:border-neon-purple/35">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] border border-neon-purple/30 bg-neon-purple/15 text-neon-purple shadow-[0_0_24px_rgba(180,77,255,0.18)]">
          <Icon size={30} aria-hidden="true" />
        </span>
        <span className={cn('rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]', status.className)}>
          {status.label}
        </span>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <span className={cn('h-2.5 w-2.5 rounded-full', severity.dot)} />
        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em]', severity.className)}>
          {severity.label}
        </span>
      </div>

      <h3 className="mt-4 text-2xl font-black text-white">{event.title}</h3>
      <p className="mt-3 min-h-[54px] text-base leading-7 text-gray-500">{event.description}</p>

      <div className="mt-5 rounded-[14px] border border-white/10 bg-[#08090b] p-4 text-sm leading-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-gray-500">Último envio</span>
          <span className="font-bold text-gray-300">{formatDateTime(subscription?.lastSentAt)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-gray-500">Falhas</span>
          <span className="font-bold text-gray-300">{subscription?.failureCount ?? 0}</span>
        </div>
        {subscription?.lastError && (
          <p className="mt-3 line-clamp-2 text-xs font-bold text-neon-orange">{subscription.lastError}</p>
        )}
      </div>

      <div className="mt-auto grid gap-2 pt-5">
        <Button
          type="button"
          onClick={onConfigure}
          className="h-12 rounded-[14px] border border-neon-purple/40 bg-neon-purple px-5 text-base font-black text-white shadow-[0_0_18px_rgba(180,77,255,0.2)] hover:bg-neon-purple/90"
        >
          <Settings size={17} className="mr-2" aria-hidden="true" />
          Configurar Webhook
        </Button>

        {subscription && (
          <div className="grid grid-cols-3 gap-2">
            <IconButton
              label="Testar"
              icon={testing ? Loader2 : Send}
              spin={testing}
              disabled={busy || testing}
              onClick={onTest}
            />
            <IconButton
              label={subscription.status === 'active' ? 'Pausar' : 'Ativar'}
              icon={subscription.status === 'active' ? Pause : Play}
              disabled={busy || testing}
              onClick={subscription.status === 'active' ? onPause : onResume}
            />
            <IconButton
              label="Remover"
              icon={Trash2}
              disabled={busy || testing}
              danger
              onClick={onDelete}
            />
          </div>
        )}
      </div>
    </article>
  )
}

function IconButton({
  label,
  icon: Icon,
  disabled,
  danger,
  spin,
  onClick,
}: {
  label: string
  icon: LucideIcon
  disabled?: boolean
  danger?: boolean
  spin?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-10 items-center justify-center gap-1.5 rounded-[12px] border text-xs font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        danger
          ? 'border-red-500/20 bg-red-500/5 text-red-300 hover:bg-red-500/10'
          : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-neon-purple/30 hover:text-white',
      )}
    >
      <Icon size={14} className={spin ? 'animate-spin' : ''} aria-hidden="true" />
      {label}
    </button>
  )
}

function WebhookConfigModal({
  event,
  subscription,
  saving,
  onClose,
  onSave,
}: {
  event: WebhookEventDefinition
  subscription: WebhookSubscription | null
  saving: boolean
  onClose: () => void
  onSave: (eventType: WebhookEventType, targetUrl: string) => Promise<void>
}) {
  const [targetUrl, setTargetUrl] = useState(subscription?.targetUrl ?? '')
  const [error, setError] = useState<string | null>(null)
  const Icon = EVENT_ICONS[event.iconKey]

  async function handleSave() {
    setError(null)
    try {
      await onSave(event.type, targetUrl)
    } catch (err) {
      setError(normalizeError(err))
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="webhook-config-title"
        className="w-full max-w-2xl rounded-[24px] border border-white/10 bg-[#111111] shadow-[0_24px_90px_rgba(0,0,0,0.65)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-neon-purple/25 bg-neon-purple/10 text-neon-purple">
              <Icon size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 id="webhook-config-title" className="text-2xl font-black text-white">
                Configurar {event.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Cole a URL HTTPS do PushCut, n8n, Make, Zapier ou outro endpoint que receberá este alerta.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-500 transition-colors hover:text-white"
            aria-label="Fechar configuração"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-gray-500">URL do Webhook *</span>
            <Input
              value={targetUrl}
              onChange={(eventChange) => setTargetUrl(eventChange.target.value)}
              placeholder="https://api.pushcut.io/..."
              className="h-14 rounded-[14px] border-white/10 bg-[#151515] px-5 text-base font-bold text-white placeholder:text-gray-700 focus-visible:ring-neon-purple/40"
            />
          </label>

          <div className="rounded-[16px] border border-white/10 bg-white/[0.025] px-4 py-4 text-sm leading-6 text-gray-400">
            <ShieldCheck size={17} className="mr-2 inline text-neon-purple" aria-hidden="true" />
            A Kraxium envia somente dados do evento, como nome do bot, valor, gateway e status.
            Tokens do Telegram, API keys e credenciais de pagamento nunca entram no payload.
          </div>

          {error && (
            <div className="rounded-[14px] border border-neon-orange/30 bg-neon-orange/10 px-4 py-3 text-sm leading-6 text-neon-orange">
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 p-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="rounded-full border-white/10 bg-black/40 px-5 font-black text-gray-200 hover:bg-white/10"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-full border border-neon-purple/70 bg-[linear-gradient(90deg,#b44dff,#ff2a9d)] px-6 font-black text-white shadow-[0_0_18px_rgba(180,77,255,0.25)] hover:opacity-95 disabled:opacity-45"
          >
            {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
            Salvar Webhook
          </Button>
        </div>
      </div>
    </div>
  )
}

function getSubscriptionStatus(subscription: WebhookSubscription | null) {
  if (!subscription) {
    return {
      label: 'não configurado',
      className: 'border-white/10 bg-white/[0.03] text-gray-500',
    }
  }
  if (subscription.status === 'active') {
    return {
      label: 'ativo',
      className: 'border-neon-green/30 bg-neon-green/10 text-neon-green',
    }
  }
  if (subscription.status === 'paused') {
    return {
      label: 'pausado',
      className: 'border-neon-orange/30 bg-neon-orange/10 text-neon-orange',
    }
  }
  return {
    label: 'com erro',
    className: 'border-red-500/30 bg-red-500/10 text-red-300',
  }
}

function buildSummary(available: number, subscriptions: WebhookSubscription[]) {
  return {
    active: subscriptions.filter((subscription) => subscription.status === 'active').length,
    configured: subscriptions.length,
    available,
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'sem envio'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'sem envio'
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível concluir a ação.'
}
