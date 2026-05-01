import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  DollarSign,
  Edit3,
  Loader2,
  Megaphone,
  Plus,
  Send,
  Target,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { listLeadFilterOptions, type LeadFilterOptions } from '@/lib/api/users'
import {
  listRemarketingDashboard,
  previewRemarketingAudience,
  saveRemarketingCampaign,
  sendRemarketingCampaign,
  type RemarketingCampaign,
  type RemarketingDashboard,
  type RemarketingFilters,
  type RemarketingLastSeenFilter,
  type RemarketingLeadStatus,
  type RemarketingPreview,
  type RemarketingStartsFilter,
} from '@/lib/api/remarketing'
import {
  getRemarketingStatusLabel,
  isRemarketingSendable,
  renderRemarketingTemplate,
} from '@/lib/remarketingCore'
import { cn } from '@/lib/utils'

const emptyDashboard: RemarketingDashboard = {
  summary: {
    totalCampaigns: 0,
    activeCampaigns: 0,
    messagesSent: 0,
    revenueCents: 0,
  },
  campaigns: [],
}

const emptyOptions: LeadFilterOptions = {
  bots: [],
  flows: [],
}

const leadStatusOptions: Array<{ value: RemarketingLeadStatus; label: string }> = [
  { value: 'pendente', label: 'Pendentes' },
  { value: 'novo', label: 'Novos' },
  { value: 'pago', label: 'Pagos' },
  { value: 'all', label: 'Todos, menos bloqueados' },
]

const startsOptions: Array<{ value: RemarketingStartsFilter; label: string }> = [
  { value: 'all', label: 'Qualquer quantidade' },
  { value: 'one', label: '1 start' },
  { value: 'twoPlus', label: '2+ starts' },
  { value: 'fivePlus', label: '5+ starts' },
  { value: 'tenPlus', label: '10+ starts' },
]

const lastSeenOptions: Array<{ value: RemarketingLastSeenFilter; label: string }> = [
  { value: 'month', label: 'Últimos 30 dias' },
  { value: 'week', label: 'Últimos 7 dias' },
  { value: 'today', label: 'Hoje' },
  { value: 'all', label: 'Todo histórico' },
]

const defaultMessage =
  'Oi {nome}, vi que você ainda não concluiu sua compra. Posso te ajudar a finalizar pelo bot {bot}?'

export default function RemarketingPage() {
  const [dashboard, setDashboard] = useState<RemarketingDashboard>(emptyDashboard)
  const [options, setOptions] = useState<LeadFilterOptions>(emptyOptions)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogCampaign, setDialogCampaign] = useState<RemarketingCampaign | null | 'new'>(null)
  const [sendCampaign, setSendCampaign] = useState<RemarketingCampaign | null>(null)
  const [sending, setSending] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)

    try {
      const [nextDashboard, nextOptions] = await Promise.all([
        listRemarketingDashboard(),
        listLeadFilterOptions().catch(() => emptyOptions),
      ])
      setDashboard(isRemarketingDashboard(nextDashboard) ? nextDashboard : emptyDashboard)
      setOptions(nextOptions)
    } catch (err) {
      setDashboard(emptyDashboard)
      setError(normalizeError(err, 'Falha ao carregar remarketing.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleSendConfirmed(campaign: RemarketingCampaign) {
    setSending(true)
    setError(null)

    try {
      await sendRemarketingCampaign(campaign.id, true)
      setSendCampaign(null)
      await load()
    } catch (err) {
      setError(normalizeError(err, 'Falha ao enviar lote de remarketing.'))
    } finally {
      setSending(false)
    }
  }

  const campaignLimitReached = dashboard.summary.totalCampaigns >= 10

  return (
    <main className="space-y-7 p-6">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-[16px] border border-neon-purple/35 bg-neon-purple/12 text-neon-purple shadow-[0_0_24px_rgba(180,77,255,0.18)]">
              <Megaphone size={30} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-4xl font-black tracking-tight text-white md:text-5xl">
                Remarketing
              </h2>
              <p className="mt-2 text-base leading-6 text-gray-500 md:text-lg">
                Crie campanhas de recuperação de vendas e reengaje seus leads
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          disabled={campaignLimitReached || options.bots.length === 0}
          onClick={() => setDialogCampaign('new')}
          className="h-14 rounded-[16px] border border-neon-purple/40 bg-[linear-gradient(90deg,#b44dff,#ff2a9d)] px-6 text-base font-black text-white shadow-[0_0_22px_rgba(180,77,255,0.25)] hover:opacity-95 disabled:opacity-50"
          title={
            options.bots.length === 0
              ? 'Crie ou conecte um bot antes de criar campanha'
              : campaignLimitReached
                ? 'Limite de 10 campanhas atingido'
                : 'Nova campanha'
          }
        >
          <Plus size={20} className="mr-2" aria-hidden="true" />
          Nova Campanha ({dashboard.summary.totalCampaigns}/10)
        </Button>
      </section>

      {error && (
        <div className="rounded-2xl border border-neon-orange/30 bg-neon-orange/10 px-4 py-3 text-sm leading-6 text-neon-orange">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <RemarketingStatCard
          icon={Megaphone}
          label="Total de Campanhas"
          value={formatNumber(dashboard.summary.totalCampaigns)}
          tone="purple"
        />
        <RemarketingStatCard
          icon={ArrowUpRight}
          label="Campanhas Ativas"
          value={formatNumber(dashboard.summary.activeCampaigns)}
          tone="cyan"
        />
        <RemarketingStatCard
          icon={Send}
          label="Mensagens Enviadas"
          value={formatNumber(dashboard.summary.messagesSent)}
          tone="pink"
        />
        <RemarketingStatCard
          icon={DollarSign}
          label="Receita Gerada"
          value={formatCurrency(dashboard.summary.revenueCents)}
          tone="green"
        />
      </section>

      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-[24px] border border-white/10 bg-[#0c0d10] text-gray-500">
          <Loader2 size={22} className="mr-3 animate-spin text-neon-purple" aria-hidden="true" />
          Carregando campanhas...
        </div>
      ) : dashboard.campaigns.length === 0 ? (
        <EmptyRemarketingState
          disabled={options.bots.length === 0}
          onCreate={() => setDialogCampaign('new')}
        />
      ) : (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {dashboard.campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onEdit={() => setDialogCampaign(campaign)}
              onSend={() => setSendCampaign(campaign)}
            />
          ))}
        </section>
      )}

      {dialogCampaign && (
        <CampaignDialog
          campaign={dialogCampaign === 'new' ? null : dialogCampaign}
          options={options}
          onClose={() => setDialogCampaign(null)}
          onSaved={async () => {
            setDialogCampaign(null)
            await load()
          }}
        />
      )}

      {sendCampaign && (
        <ConfirmSendDialog
          campaign={sendCampaign}
          sending={sending}
          onClose={() => setSendCampaign(null)}
          onConfirm={() => void handleSendConfirmed(sendCampaign)}
        />
      )}
    </main>
  )
}

function RemarketingStatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  tone: 'purple' | 'cyan' | 'pink' | 'green'
}) {
  const color = {
    purple: '#b44dff',
    cyan: '#38bdf8',
    pink: '#ff2a9d',
    green: '#39ff14',
  }[tone]

  return (
    <article className="rounded-[18px] border border-white/10 bg-[#0c0d10] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.2)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-black text-gray-500">{label}</p>
          <p className="mt-4 text-3xl font-black text-white">{value}</p>
        </div>
        <Icon size={22} aria-hidden="true" style={{ color }} />
      </div>
    </article>
  )
}

function EmptyRemarketingState({ disabled, onCreate }: { disabled: boolean; onCreate: () => void }) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-[#0c0d10] px-6 py-20 text-center shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-neon-purple/25 bg-neon-purple/12 text-neon-purple shadow-[0_0_32px_rgba(180,77,255,0.18)]">
        <Megaphone size={42} aria-hidden="true" />
      </div>
      <h3 className="mt-8 text-3xl font-black text-white">Nenhuma campanha criada</h3>
      <p className="mx-auto mt-4 max-w-xl text-lg leading-7 text-gray-500">
        Crie sua primeira campanha de remarketing para recuperar vendas e reengajar seus leads.
      </p>
      <Button
        type="button"
        disabled={disabled}
        onClick={onCreate}
        className="mt-8 h-14 rounded-[16px] border border-neon-purple/40 bg-[linear-gradient(90deg,#b44dff,#ff2a9d)] px-8 text-base font-black text-white shadow-[0_0_22px_rgba(180,77,255,0.24)] hover:opacity-95 disabled:opacity-50"
      >
        <Plus size={20} className="mr-2" aria-hidden="true" />
        Criar Primeira Campanha
      </Button>
      {disabled && (
        <p className="mt-4 text-sm text-gray-600">Conecte ou crie um bot antes de criar campanhas.</p>
      )}
    </section>
  )
}

function CampaignCard({
  campaign,
  onEdit,
  onSend,
}: {
  campaign: RemarketingCampaign
  onEdit: () => void
  onSend: () => void
}) {
  const sendable = isRemarketingSendable(campaign.status, campaign.queuedCount)
  const sentLocked = campaign.sentCount > 0

  return (
    <article className="overflow-hidden rounded-[20px] border border-white/10 bg-[#0c0d10] transition-colors hover:border-neon-purple/35">
      <div className="p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border border-neon-purple/25 bg-neon-purple/12 text-neon-purple">
            <Megaphone size={22} aria-hidden="true" />
          </span>
          <StatusPill status={campaign.status} />
        </div>

        <h3 className="truncate text-xl font-black text-white">{campaign.name}</h3>
        <p className="mt-3 line-clamp-2 min-h-[44px] text-sm leading-6 text-gray-500">{campaign.message}</p>

        <div className="mt-5 space-y-2 text-sm text-gray-500">
          <MetaLine icon={Bot} label={campaign.botName} />
          <MetaLine icon={Target} label={campaign.flowName ?? 'Todos os fluxos do bot'} />
          <MetaLine icon={CalendarClock} label={formatDate(campaign.updatedAt)} />
        </div>
      </div>

      <div className="grid grid-cols-3 border-y border-white/10">
        <CampaignMetric label="Publico" value={formatNumber(campaign.audienceCount)} />
        <CampaignMetric label="Enviadas" value={formatNumber(campaign.sentCount)} />
        <CampaignMetric label="Falhas" value={formatNumber(campaign.failedCount)} />
      </div>

      <div className="grid grid-cols-2 border-b border-white/10">
        <CampaignMetric label="Na fila" value={formatNumber(campaign.queuedCount)} />
        <CampaignMetric label="Receita" value={formatCurrency(campaign.revenueCents)} />
      </div>

      <button
        type="button"
        onClick={onSend}
        disabled={!sendable}
        className="flex w-full items-center justify-center gap-2 border-b border-white/10 px-5 py-4 text-sm font-black text-white transition-colors hover:bg-neon-purple/10 hover:text-neon-purple disabled:cursor-not-allowed disabled:text-gray-700 disabled:hover:bg-transparent"
      >
        <Send size={15} aria-hidden="true" />
        {campaign.queuedCount > 0 ? 'Enviar lote com confirmação' : 'Sem mensagens na fila'}
      </button>

      <button
        type="button"
        onClick={onEdit}
        disabled={sentLocked}
        className="flex w-full items-center justify-center gap-2 px-5 py-4 text-sm font-black text-white transition-colors hover:bg-neon-purple/10 hover:text-neon-purple disabled:cursor-not-allowed disabled:text-gray-700 disabled:hover:bg-transparent"
        title={sentLocked ? 'Campanhas ja enviadas nao podem trocar publico ou mensagem' : 'Editar campanha'}
      >
        <Edit3 size={15} aria-hidden="true" />
        Editar Campanha
      </button>
    </article>
  )
}

function StatusPill({ status }: { status: string }) {
  const isPositive = status === 'ready' || status === 'sent'
  const className = isPositive
    ? 'border-neon-green/25 bg-neon-green/10 text-neon-green'
    : status === 'failed'
      ? 'border-neon-orange/25 bg-neon-orange/10 text-neon-orange'
      : 'border-white/10 bg-white/5 text-gray-500'

  return (
    <span className={cn('rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]', className)}>
      {getRemarketingStatusLabel(status)}
    </span>
  )
}

function MetaLine({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <p className="flex min-w-0 items-center gap-2">
      <Icon size={15} className="shrink-0 text-gray-600" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </p>
  )
}

function CampaignMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-white/10 px-4 py-4 text-center last:border-r-0">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-600">{label}</p>
      <p className="mt-2 truncate text-lg font-black text-white">{value}</p>
    </div>
  )
}

interface CampaignDialogProps {
  campaign: RemarketingCampaign | null
  options: LeadFilterOptions
  onClose: () => void
  onSaved: () => Promise<void>
}

function CampaignDialog({ campaign, options, onClose, onSaved }: CampaignDialogProps) {
  const firstBotId = options.bots[0]?.id ?? ''
  const [name, setName] = useState(campaign?.name ?? 'Recuperacao de venda')
  const [message, setMessage] = useState(campaign?.message ?? defaultMessage)
  const [filters, setFilters] = useState<RemarketingFilters>(
    campaign?.filters ?? {
      botId: firstBotId,
      flowId: null,
      leadStatus: 'pendente',
      starts: 'all',
      lastSeen: 'month',
    },
  )
  const [preview, setPreview] = useState<RemarketingPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredFlows = useMemo(
    () => options.flows.filter((flow) => !filters.botId || flow.bot_id === filters.botId),
    [filters.botId, options.flows],
  )
  const selectedBot = options.bots.find((bot) => bot.id === filters.botId) ?? null
  const selectedFlow = options.flows.find((flow) => flow.id === filters.flowId) ?? null
  const messagePreview = renderRemarketingTemplate(message, {
    name: preview?.sample[0]?.name ?? 'Maria',
    botName: selectedBot?.name ?? 'Kraxium Bot',
    flowName: selectedFlow?.name ?? 'Checkout',
  })

  function updateFilter<K extends keyof RemarketingFilters>(key: K, value: RemarketingFilters[K]) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === 'botId' ? { flowId: null } : {}),
    }))
    setPreview(null)
  }

  async function handlePreview() {
    setLoadingPreview(true)
    setError(null)

    try {
      setPreview(await previewRemarketingAudience(filters))
    } catch (err) {
      setError(normalizeError(err, 'Falha ao calcular publico.'))
    } finally {
      setLoadingPreview(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    try {
      await saveRemarketingCampaign({
        campaignId: campaign?.id ?? null,
        name,
        message,
        filters,
      })
      await onSaved()
    } catch (err) {
      setError(normalizeError(err, 'Falha ao salvar campanha.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[26px] border border-neon-purple/25 bg-[#0c0d10] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.62)]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-neon-purple/25 bg-neon-purple/12 text-neon-purple">
              <Megaphone size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neon-purple">
                Campanha
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">
                {campaign ? 'Editar Remarketing' : 'Nova Campanha'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Prepare o público real e revise a mensagem antes de salvar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 hover:text-white"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-neon-orange/30 bg-neon-orange/10 px-4 py-3 text-sm leading-6 text-neon-orange">
            {error}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Field label="Nome da campanha">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-12 w-full rounded-[14px] border border-white/10 bg-[#08090b] px-4 text-sm font-bold text-white outline-none transition focus:border-neon-purple/50"
                placeholder="Ex: Recuperar carrinho"
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Bot">
                <select
                  value={filters.botId}
                  onChange={(event) => updateFilter('botId', event.target.value)}
                  className="h-12 w-full rounded-[14px] border border-white/10 bg-[#08090b] px-4 text-sm font-bold text-white outline-none focus:border-neon-purple/50"
                >
                  {options.bots.length === 0 && <option value="">Nenhum bot encontrado</option>}
                  {options.bots.map((bot) => (
                    <option key={bot.id} value={bot.id}>{bot.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Fluxo">
                <select
                  value={filters.flowId ?? 'all'}
                  onChange={(event) => updateFilter('flowId', event.target.value === 'all' ? null : event.target.value)}
                  className="h-12 w-full rounded-[14px] border border-white/10 bg-[#08090b] px-4 text-sm font-bold text-white outline-none focus:border-neon-purple/50"
                >
                  <option value="all">Todos os fluxos do bot</option>
                  {filteredFlows.map((flow) => (
                    <option key={flow.id} value={flow.id}>{flow.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Status do lead">
                <select
                  value={filters.leadStatus}
                  onChange={(event) => updateFilter('leadStatus', event.target.value as RemarketingLeadStatus)}
                  className="h-12 w-full rounded-[14px] border border-white/10 bg-[#08090b] px-4 text-sm font-bold text-white outline-none focus:border-neon-purple/50"
                >
                  {leadStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Quantidade de starts">
                <select
                  value={filters.starts}
                  onChange={(event) => updateFilter('starts', event.target.value as RemarketingStartsFilter)}
                  className="h-12 w-full rounded-[14px] border border-white/10 bg-[#08090b] px-4 text-sm font-bold text-white outline-none focus:border-neon-purple/50"
                >
                  {startsOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Último contato">
                <select
                  value={filters.lastSeen}
                  onChange={(event) => updateFilter('lastSeen', event.target.value as RemarketingLastSeenFilter)}
                  className="h-12 w-full rounded-[14px] border border-white/10 bg-[#08090b] px-4 text-sm font-bold text-white outline-none focus:border-neon-purple/50"
                >
                  {lastSeenOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Mensagem">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={6}
                className="w-full resize-none rounded-[14px] border border-white/10 bg-[#08090b] px-4 py-3 text-sm font-semibold leading-6 text-white outline-none transition placeholder:text-gray-700 focus:border-neon-purple/50"
                placeholder={defaultMessage}
              />
            </Field>

            <div className="rounded-[16px] border border-white/10 bg-[#08090b] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-600">Preview da mensagem</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-300">{messagePreview}</p>
              <p className="mt-3 text-xs text-gray-600">Variáveis: {'{nome}'}, {'{bot}'}, {'{fluxo}'}</p>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[18px] border border-neon-purple/25 bg-neon-purple/10 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-neon-purple">Público real</p>
              <p className="mt-3 text-4xl font-black text-white">
                {preview ? formatNumber(preview.count) : '--'}
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Leads com chat do Telegram, excluindo bloqueados.
              </p>
              <Button
                type="button"
                onClick={() => void handlePreview()}
                disabled={!filters.botId || loadingPreview}
                className="mt-5 w-full rounded-[14px] border border-neon-purple/40 bg-neon-purple/15 text-neon-purple hover:bg-neon-purple/25"
              >
                {loadingPreview ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Target size={16} className="mr-2" />}
                Calcular Público
              </Button>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-[#08090b] p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-600">Amostra</p>
              {preview?.sample.length ? (
                <div className="mt-4 space-y-3">
                  {preview.sample.map((lead) => (
                    <div key={lead.id} className="rounded-[12px] border border-white/10 bg-white/[0.03] px-3 py-3">
                      <p className="truncate text-sm font-black text-white">{lead.name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {lead.status} · {lead.starts} starts · {formatDate(lead.lastSeenAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-gray-500">
                  Calcule o público para ver alguns leads que entrarão na campanha.
                </p>
              )}
            </div>
          </aside>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="rounded-full border-white/10 bg-white/5 px-5 text-gray-200 hover:bg-white/10"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !filters.botId}
            className="rounded-full border border-neon-purple/70 bg-[linear-gradient(90deg,#b44dff,#ff2a9d)] px-6 font-bold text-white shadow-[0_0_18px_rgba(180,77,255,0.25)] hover:opacity-95 disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <CheckCircle2 size={16} className="mr-2" />}
            Salvar e Preparar
          </Button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">
        {label}
      </span>
      {children}
    </label>
  )
}

function ConfirmSendDialog({
  campaign,
  sending,
  onClose,
  onConfirm,
}: {
  campaign: RemarketingCampaign
  sending: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[24px] border border-neon-orange/25 bg-[#0c0d10] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.62)]">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-neon-orange/25 bg-neon-orange/10 text-neon-orange">
            <AlertTriangle size={24} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neon-orange">
              Confirmação obrigatória
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">Enviar campanha?</h2>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Esta ação vai enviar mensagens reais pelo Telegram para até 25 leads deste lote.
              A fila restante continua preparada para novo envio manual.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[16px] border border-white/10 bg-[#08090b] p-4">
          <p className="text-lg font-black text-white">{campaign.name}</p>
          <p className="mt-2 text-sm text-gray-500">
            Na fila: <span className="font-black text-white">{campaign.queuedCount}</span> · Bot:{' '}
            <span className="font-black text-white">{campaign.botName}</span>
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={sending}
            className="rounded-full border-white/10 bg-white/5 px-5 text-gray-200 hover:bg-white/10"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={sending}
            className="rounded-full border border-neon-orange/50 bg-neon-orange/15 px-6 font-black text-neon-orange hover:bg-neon-orange/20"
          >
            {sending ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Send size={16} className="mr-2" />}
            Confirmar e Enviar Lote
          </Button>
        </div>
      </div>
    </div>
  )
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format((Number(cents) || 0) / 100)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(Number(value) || 0)
}

function formatDate(value: string | null) {
  if (!value) return 'Sem data'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sem data'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function normalizeError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function isRemarketingDashboard(value: unknown): value is RemarketingDashboard {
  if (!value || typeof value !== 'object') return false
  const dashboard = value as Partial<RemarketingDashboard>
  return Boolean(dashboard.summary) && Array.isArray(dashboard.campaigns)
}
