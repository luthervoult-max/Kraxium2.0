import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FileAudio,
  FileVideo,
  Image,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { listLeadFilterOptions, type LeadFilterOptions } from '@/lib/api/users'
import {
  controlMailingCampaign,
  listMailingDashboard,
  mailingGroups,
  previewMailingAudience,
  saveMailingCampaign,
  sendMailingCampaign,
  uploadMailingAsset,
  type MailingAssetInput,
  type MailingButtonConfig,
  type MailingCampaign,
  type MailingDashboard,
  type MailingFilters,
  type MailingPreview,
  type MailingRecipientGroup,
} from '@/lib/api/mailing'
import { cn } from '@/lib/utils'

interface MailingPageProps {
  selectedBotId?: string | null
}

const emptyOptions: LeadFilterOptions = {
  bots: [],
  flows: [],
}

const emptyDashboard: MailingDashboard = {
  selectedBotId: null,
  groupCounts: mailingGroups.map((group) => ({ group: group.value, label: group.label, count: 0 })),
  campaigns: [],
  summary: {
    totalCampaigns: 0,
    configuredCampaigns: 0,
    sentRuns: 0,
    messagesSent: 0,
    failedMessages: 0,
    availableCampaigns: 50,
  },
}

const emptyAsset: MailingAssetInput = { path: null, mime: null, name: null }
const defaultMessage = 'Oi {profile_name}, tenho uma novidade importante para voce.'
const inputClass =
  'w-full rounded-[18px] border border-white/10 bg-[#0c0d10] px-5 py-3 text-base font-bold text-white outline-none transition placeholder:text-gray-600 focus:border-neon-purple/60 focus:ring-2 focus:ring-neon-purple/20'

export default function MailingPage({ selectedBotId }: MailingPageProps) {
  const [options, setOptions] = useState<LeadFilterOptions>(emptyOptions)
  const [selectedBot, setSelectedBot] = useState<string | null>(selectedBotId ?? null)
  const [dashboard, setDashboard] = useState<MailingDashboard>(emptyDashboard)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<MailingCampaign | 'new' | null>(null)
  const [sendTarget, setSendTarget] = useState<MailingCampaign | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let active = true
    listLeadFilterOptions()
      .then((nextOptions) => {
        if (!active) return
        setOptions(nextOptions)
        setSelectedBot((current) => current ?? selectedBotId ?? nextOptions.bots[0]?.id ?? null)
      })
      .catch((err) => {
        if (!active) return
        setOptions(emptyOptions)
        setError(normalizeError(err, 'Falha ao carregar bots.'))
      })
    return () => {
      active = false
    }
  }, [selectedBotId])

  async function load(botId = selectedBot) {
    setLoading(true)
    setError(null)
    try {
      const nextDashboard = await listMailingDashboard(botId)
      setDashboard(nextDashboard)
    } catch (err) {
      setDashboard(emptyDashboard)
      setError(normalizeError(err, 'Falha ao carregar Mailing.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(selectedBot)
  }, [selectedBot])

  const hasActiveCampaign = useMemo(
    () => dashboard.campaigns.some((campaign) => campaign.status === 'sending' || campaign.status === 'scheduled'),
    [dashboard.campaigns],
  )

  useEffect(() => {
    if (!hasActiveCampaign) return
    const interval = window.setInterval(() => {
      void load(selectedBot)
    }, 6000)
    return () => window.clearInterval(interval)
  }, [hasActiveCampaign, selectedBot])

  const selectedBotName = useMemo(
    () => options.bots.find((bot) => bot.id === selectedBot)?.name ?? 'Nenhum bot selecionado',
    [options.bots, selectedBot],
  )

  async function handleSendConfirmed(campaign: MailingCampaign) {
    setSending(true)
    setError(null)
    try {
      await sendMailingCampaign(campaign.id, true)
      setSendTarget(null)
      await load()
    } catch (err) {
      setError(normalizeError(err, 'Falha ao enviar Mailing.'))
    } finally {
      setSending(false)
    }
  }

  async function handleControl(campaign: MailingCampaign, action: 'pause' | 'resume' | 'cancel') {
    setError(null)
    try {
      await controlMailingCampaign(campaign.id, action)
      await load()
    } catch (err) {
      setError(normalizeError(err, 'Falha ao atualizar Mailing.'))
    }
  }

  if (editing) {
    return (
      <MailingForm
        campaign={editing === 'new' ? null : editing}
        options={options}
        selectedBotId={selectedBot}
        dashboard={dashboard}
        onBack={() => setEditing(null)}
        onSaved={async (campaign) => {
          setEditing(null)
          setSelectedBot(campaign.botId)
          await load(campaign.botId)
          if (campaign.openSendDialog && campaign.status === 'ready') setSendTarget(campaign)
        }}
      />
    )
  }

  return (
    <main className="space-y-7 p-6">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-[16px] border border-neon-purple/35 bg-neon-purple/12 text-neon-purple shadow-[0_0_24px_rgba(180,77,255,0.18)]">
              <Mail size={30} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.45em] text-neon-purple">
                Automacao
              </p>
              <h2 className="mt-2 text-4xl font-black tracking-tight text-white md:text-5xl">
                Mailing Bot: <span className="text-neon-purple">{selectedBotName}</span>
              </h2>
              <p className="mt-2 text-base leading-6 text-gray-500 md:text-lg">
                Envie campanhas reais para leads ativos do Telegram com controle de publico,
                historico e confirmacao.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={selectedBot ?? ''}
            onChange={(event) => setSelectedBot(event.target.value || null)}
            className="h-12 min-w-[240px] rounded-full border border-white/10 bg-surface-3 px-4 text-sm font-bold text-white outline-none focus:border-neon-purple/60"
          >
            <option value="">Selecione um bot</option>
            {options.bots.map((bot) => (
              <option key={bot.id} value={bot.id}>
                {bot.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            disabled={!selectedBot || dashboard.summary.totalCampaigns >= 50}
            onClick={() => setEditing('new')}
            variant="neonGradient"
            size="cta"
            className="border-neon-purple/40 px-6 shadow-[0_0_22px_rgba(180,77,255,0.25)]"
          >
            <Plus size={20} className="mr-2" aria-hidden="true" />
            Criar Mailing ({dashboard.summary.totalCampaigns}/50)
          </Button>
        </div>
      </section>

      {error && <Notice tone="orange">{error}</Notice>}

      <Notice tone="orange">
        Cada envio de mailing e unico e so pode ser repetido a cada 3 horas por bot para
        preservar qualidade e evitar disparos duplicados.
      </Notice>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard icon={Send} label="Mailings Enviados" value={formatNumber(dashboard.summary.sentRuns)} />
        <StatCard icon={CheckCircle2} label="Configurados" value={formatNumber(dashboard.summary.configuredCampaigns)} />
        <StatCard icon={Mail} label="Disponiveis" value={formatNumber(dashboard.summary.availableCampaigns)} />
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {dashboard.groupCounts.map((group) => (
          <button
            type="button"
            key={group.group}
            onClick={() => {
              if (selectedBot) setEditing('new')
            }}
            className="rounded-[20px] border border-white/10 bg-surface-2 p-5 text-center transition hover:border-neon-purple/45 hover:bg-neon-purple/10"
          >
            <div className="text-sm font-bold text-gray-500">{group.label}</div>
            <div className="mt-3 text-3xl font-black text-white">{formatNumber(group.count)}</div>
          </button>
        ))}
      </section>

      {loading ? (
        <div className="flex min-h-[340px] items-center justify-center rounded-[24px] border border-white/10 bg-surface-2 text-gray-500">
          <Loader2 size={22} className="mr-3 animate-spin text-neon-purple" aria-hidden="true" />
          Carregando mailings...
        </div>
      ) : dashboard.campaigns.length === 0 ? (
        <EmptyState disabled={!selectedBot} onCreate={() => setEditing('new')} />
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-white">
              Mailings Enviados ({dashboard.campaigns.length} no total)
            </h3>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-300 hover:border-neon-purple/40 hover:text-white"
            >
              <RefreshCw size={15} aria-hidden="true" />
              Atualizar
            </button>
          </div>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            {dashboard.campaigns.map((campaign) => (
              <MailingCard
                key={campaign.id}
                campaign={campaign}
                onEdit={() => setEditing(campaign)}
                onSend={() => setSendTarget(campaign)}
                onControl={(action) => {
                  if (action === 'cancel' && !window.confirm(`Cancelar o mailing "${campaign.name}"? Os destinatarios em fila nao receberao mais.`)) return
                  void handleControl(campaign, action)
                }}
              />
            ))}
          </div>
        </section>
      )}

      {sendTarget && (
        <ConfirmSendDialog
          campaign={sendTarget}
          sending={sending}
          onClose={() => setSendTarget(null)}
          onConfirm={() => void handleSendConfirmed(sendTarget)}
        />
      )}
    </main>
  )
}

function MailingForm({
  campaign,
  options,
  selectedBotId,
  dashboard,
  onBack,
  onSaved,
}: {
  campaign: MailingCampaign | null
  options: LeadFilterOptions
  selectedBotId: string | null
  dashboard: MailingDashboard
  onBack: () => void
  onSaved: (campaign: MailingCampaign & { openSendDialog?: boolean }) => Promise<void>
}) {
  const [botId, setBotId] = useState(campaign?.botId ?? selectedBotId ?? options.bots[0]?.id ?? '')
  const [group, setGroup] = useState<MailingRecipientGroup>(campaign?.filters.group ?? 'all')
  const [flowId, setFlowId] = useState(campaign?.filters.flowId ?? 'all')
  const [name, setName] = useState(campaign?.name ?? '')
  const [message, setMessage] = useState(campaign?.message ?? defaultMessage)
  const [buttons, setButtons] = useState<MailingButtonConfig[]>(campaign?.buttons ?? [])
  const [media, setMedia] = useState<MailingAssetInput>(campaign?.media ?? emptyAsset)
  const [audio, setAudio] = useState<MailingAssetInput>(campaign?.audio ?? emptyAsset)
  const [scheduleEnabled, setScheduleEnabled] = useState(campaign?.scheduleEnabled ?? false)
  const [scheduledAt, setScheduledAt] = useState(toLocalInputValue(campaign?.scheduledAt))
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(campaign?.recurrenceEnabled ?? false)
  const [recurrenceHours, setRecurrenceHours] = useState(campaign?.recurrenceIntervalHours || 3)
  const [preview, setPreview] = useState<MailingPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'media' | 'audio' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mediaInputRef = useRef<HTMLInputElement | null>(null)
  const audioInputRef = useRef<HTMLInputElement | null>(null)

  const selectedBotName = options.bots.find((bot) => bot.id === botId)?.name ?? 'bot'
  const flowsForBot = options.flows.filter((flow) => !botId || !flow.bot_id || flow.bot_id === botId)
  const filters = useMemo<MailingFilters>(
    () => ({
      botId,
      flowId: flowId === 'all' ? null : flowId,
      group,
    }),
    [botId, flowId, group],
  )

  async function loadPreview() {
    if (!botId) return
    setLoadingPreview(true)
    setError(null)
    try {
      const nextPreview = await previewMailingAudience(filters, message)
      setPreview(nextPreview)
    } catch (err) {
      setPreview(null)
      setError(normalizeError(err, 'Falha ao calcular publico.'))
    } finally {
      setLoadingPreview(false)
    }
  }

  useEffect(() => {
    if (botId) void loadPreview()
  }, [botId, group, flowId])

  async function handleUpload(event: ChangeEvent<HTMLInputElement>, kind: 'media' | 'audio') {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(kind)
    setError(null)
    try {
      const asset = await uploadMailingAsset(file, kind)
      if (kind === 'media') setMedia(asset)
      if (kind === 'audio') setAudio(asset)
    } catch (err) {
      setError(normalizeError(err, 'Falha ao enviar arquivo.'))
    } finally {
      setUploading(null)
      event.target.value = ''
    }
  }

  async function handleSave(sendAfterSave: boolean) {
    setSaving(true)
    setError(null)
    try {
      const saved = await saveMailingCampaign({
        campaignId: campaign?.id ?? null,
        name,
        message,
        filters,
        buttons,
        media,
        audio,
        scheduleEnabled,
        scheduledAt: scheduleEnabled && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        recurrenceEnabled,
        recurrenceIntervalHours: recurrenceEnabled ? recurrenceHours : 0,
      })
      await onSaved({ ...saved, openSendDialog: sendAfterSave })
    } catch (err) {
      setError(normalizeError(err, 'Falha ao salvar Mailing.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="space-y-7 p-6">
      <section className="rounded-[28px] border border-white/10 bg-surface-2 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.45em] text-neon-purple">
              Mailing
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">
              {campaign ? 'Editar Mailing' : 'Criar Mailing'} - {selectedBotName}
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-6 text-gray-500">
              Configure mensagem, publico, midia, botoes, agendamento e recorrencia antes de
              confirmar qualquer disparo.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="rounded-full border-white/10 bg-white/5 px-5 text-gray-200 hover:bg-white/10"
          >
            <X size={18} className="mr-2" aria-hidden="true" />
            Voltar
          </Button>
        </div>

        {error && <div className="mt-5"><Notice tone="orange">{error}</Notice></div>}

        <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            <Field label="Bot executor">
              <select value={botId} onChange={(event) => setBotId(event.target.value)} className={inputClass}>
                <option value="">Selecione um bot</option>
                {options.bots.map((bot) => (
                  <option key={bot.id} value={bot.id}>
                    {bot.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Nome do Mailing">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex: Promocao exclusiva"
                className={inputClass}
                maxLength={120}
              />
            </Field>

            <Field
              label="Mensagem Inicial"
              footer={
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    Variaveis:
                    {['{profile_name}', '{country}', '{state}', '{city}'].map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => setMessage((current) => `${current} ${variable}`.trim())}
                        className="rounded-full border border-white/10 bg-white/6 px-3 py-1 font-mono text-gray-200 hover:border-neon-purple/40"
                      >
                        {variable}
                      </button>
                    ))}
                  </div>
                  <span className={cn('text-sm font-bold', message.length > 4096 ? 'text-red-400' : 'text-gray-400')}>
                    {message.length}/4096
                  </span>
                </div>
              }
            >
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Digite aqui a mensagem que sera enviada..."
                className={cn(inputClass, 'min-h-[220px] resize-y py-4')}
                maxLength={4096}
              />
            </Field>

            <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-white">Grupo de destinatarios</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Somente leads ativos, com chat do Telegram e sem status bloqueado entram no publico.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadPreview()}
                  disabled={!botId || loadingPreview}
                  className="rounded-full border-white/10 bg-white/5 text-gray-200"
                >
                  {loadingPreview ? <Loader2 size={16} className="mr-2 animate-spin" /> : <RefreshCw size={16} className="mr-2" />}
                  Recalcular
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {mailingGroups.map((item) => {
                  const count = dashboard.groupCounts.find((candidate) => candidate.group === item.value)?.count ?? 0
                  const active = group === item.value
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setGroup(item.value)}
                      className={cn(
                        'rounded-[18px] border p-4 text-left transition',
                        active
                          ? 'border-neon-purple/70 bg-neon-purple/15 shadow-[0_0_22px_rgba(180,77,255,0.18)]'
                          : 'border-white/10 bg-white/[0.03] hover:border-neon-purple/35',
                      )}
                    >
                      <div className="text-sm font-bold text-gray-400">{item.label}</div>
                      <div className="mt-2 text-3xl font-black text-white">{formatNumber(count)}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <Field label="Fluxo opcional">
              <select value={flowId} onChange={(event) => setFlowId(event.target.value)} className={inputClass}>
                <option value="all">Todos os fluxos</option>
                {flowsForBot.map((flow) => (
                  <option key={flow.id} value={flow.id}>
                    {flow.name}
                  </option>
                ))}
              </select>
            </Field>

            <MessageButtonsEditor buttons={buttons} onChange={setButtons} />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <UploadPanel
                icon={Image}
                title="Midia"
                description="PNG, JPEG, JPG ou MP4 - maximo 25MB"
                asset={media}
                uploading={uploading === 'media'}
                onChoose={() => mediaInputRef.current?.click()}
                onClear={() => setMedia(emptyAsset)}
              />
              <UploadPanel
                icon={FileAudio}
                title="Audio"
                description="OGG - maximo 10MB"
                asset={audio}
                uploading={uploading === 'audio'}
                onChoose={() => audioInputRef.current?.click()}
                onClear={() => setAudio(emptyAsset)}
              />
              <input
                ref={mediaInputRef}
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,video/mp4"
                onChange={(event) => void handleUpload(event, 'media')}
              />
              <input
                ref={audioInputRef}
                type="file"
                className="hidden"
                accept="audio/ogg"
                onChange={(event) => void handleUpload(event, 'audio')}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <TogglePanel
                title="Agendamento"
                description="Programar o primeiro envio para uma data futura."
                checked={scheduleEnabled}
                onChange={setScheduleEnabled}
              >
                {scheduleEnabled && (
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                    className={cn(inputClass, 'mt-4')}
                  />
                )}
              </TogglePanel>
              <TogglePanel
                title="Recorrencia"
                description="Repetir o envio respeitando o intervalo minimo de 3 horas."
                checked={recurrenceEnabled}
                onChange={setRecurrenceEnabled}
              >
                {recurrenceEnabled && (
                  <div className="mt-4 flex items-center gap-3">
                    <input
                      type="number"
                      min={3}
                      max={720}
                      value={recurrenceHours}
                      onChange={(event) => setRecurrenceHours(Number(event.target.value))}
                      className={cn(inputClass, 'w-28')}
                    />
                    <span className="text-sm font-bold text-gray-400">horas</span>
                  </div>
                )}
              </TogglePanel>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-[24px] border border-neon-purple/25 bg-neon-purple/10 p-5">
              <div className="flex items-center gap-3">
                <Users className="text-neon-purple" size={24} aria-hidden="true" />
                <div>
                  <div className="text-sm font-black uppercase tracking-[0.22em] text-gray-500">
                    Publico real
                  </div>
                  <div className="mt-1 text-4xl font-black text-white">
                    {loadingPreview ? '...' : formatNumber(preview?.count ?? 0)}
                  </div>
                </div>
              </div>
              {preview?.warnings.map((warning) => (
                <p key={warning} className="mt-4 rounded-2xl border border-neon-orange/30 bg-neon-orange/10 p-3 text-sm text-neon-orange">
                  {warning}
                </p>
              ))}
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
              <h3 className="text-lg font-black text-white">Preview da mensagem</h3>
              <div className="mt-4 rounded-[18px] border border-white/10 bg-surface-4 p-4 text-sm leading-6 text-gray-200">
                {renderPreviewText(message)}
              </div>
              <div className="mt-4 space-y-2">
                {buttons.map((button) => (
                  <div key={`${button.label}-${button.url}`} className="rounded-full border border-neon-purple/30 bg-neon-purple/10 px-4 py-2 text-sm font-bold text-neon-purple">
                    {button.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
              <h3 className="text-lg font-black text-white">Amostra de leads</h3>
              <div className="mt-4 space-y-3">
                {preview?.sample.length ? (
                  preview.sample.map((lead) => (
                    <div key={lead.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="font-bold text-white">{lead.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">
                        {lead.status} - {lead.starts} starts {lead.city ? `- ${lead.city}` : ''}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Nenhum lead na amostra deste filtro.</p>
                )}
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="rounded-full border-white/10 bg-white/5 px-5 text-gray-200 hover:bg-white/10"
          >
            Voltar
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving || !botId}
            onClick={() => void handleSave(false)}
            className="rounded-full border-neon-purple/30 bg-neon-purple/10 px-5 font-bold text-neon-purple hover:bg-neon-purple/15"
          >
            {saving ? 'Salvando...' : scheduleEnabled ? 'Salvar Agendamento' : 'Salvar Rascunho'}
          </Button>
          <Button
            type="button"
            disabled={saving || !botId || scheduleEnabled}
            onClick={() => void handleSave(true)}
            variant="neonGradient"
            size="pill"
            className="font-bold"
          >
            <Send size={17} className="mr-2" aria-hidden="true" />
            Enviar Mailing
          </Button>
        </div>
      </section>
    </main>
  )
}

function MailingCard({
  campaign,
  onEdit,
  onSend,
  onControl,
}: {
  campaign: MailingCampaign
  onEdit: () => void
  onSend: () => void
  onControl: (action: 'pause' | 'resume' | 'cancel') => void
}) {
  const canSend = campaign.status === 'ready' || campaign.status === 'failed'
  const canPause = campaign.status === 'sending' || campaign.status === 'scheduled'
  const canResume = campaign.status === 'paused'
  const canCancel = canPause || canResume
  return (
    <article className="flex min-h-[320px] flex-col rounded-[24px] border border-white/10 bg-surface-2 p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-neon-purple/30 bg-neon-purple/12 text-neon-purple">
          <Mail size={22} aria-hidden="true" />
        </span>
        <StatusPill status={campaign.status} />
      </div>
      <h3 className="mt-5 text-2xl font-black text-white">{campaign.name}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-500">{campaign.botName}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <MiniMetric label="Publico" value={formatNumber(campaign.audienceCount)} />
        <MiniMetric label="Enviadas" value={formatNumber(campaign.sentCount)} />
        <MiniMetric label="Falhas" value={formatNumber(campaign.failedCount)} />
        <MiniMetric label="Cliques" value={formatNumber(campaign.clickCount)} />
      </div>
      <div className="mt-auto flex flex-col gap-3 pt-5">
        <Button type="button" variant="outline" onClick={onEdit} className="rounded-full border-white/10 bg-white/5 text-gray-200">
          Editar Mailing
        </Button>
        {canSend && (
          <Button type="button" variant="neonGradient" onClick={onSend} className="rounded-full font-bold">
            Enviar Mailing
          </Button>
        )}
        {(canPause || canResume) && (
          <div className="flex gap-2">
            {canPause && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onControl('pause')}
                className="flex-1 rounded-full border-white/10 bg-white/5 text-gray-200"
              >
                Pausar
              </Button>
            )}
            {canResume && (
              <Button
                type="button"
                variant="neonGradient"
                onClick={() => onControl('resume')}
                className="flex-1 rounded-full font-bold"
              >
                Retomar
              </Button>
            )}
            {canCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onControl('cancel')}
                className="flex-1 rounded-full border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/15"
              >
                Cancelar
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

function ConfirmSendDialog({
  campaign,
  sending,
  onClose,
  onConfirm,
}: {
  campaign: MailingCampaign
  sending: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-neon-purple/25 bg-surface-4 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.6)]">
        <div className="flex items-start gap-4">
          <span className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-neon-orange/30 bg-neon-orange/12 text-neon-orange">
            <AlertTriangle size={24} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-2xl font-black text-white">Confirmar envio?</h2>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              O mailing <strong className="text-white">{campaign.name}</strong> sera enviado para
              ate {formatNumber(campaign.audienceCount)} lead(s). A plataforma respeita o limite de
              3 horas por bot e processa em lotes.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={sending} className="rounded-full border-white/10 bg-white/5 text-gray-200">
            Cancelar
          </Button>
          <Button type="button" variant="neonGradient" onClick={onConfirm} disabled={sending} className="rounded-full font-bold">
            {sending ? 'Enviando...' : 'Confirmar envio'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function MessageButtonsEditor({
  buttons,
  onChange,
}: {
  buttons: MailingButtonConfig[]
  onChange: (buttons: MailingButtonConfig[]) => void
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-white">Botoes Personalizados</h3>
          <p className="mt-1 text-sm text-gray-500">Use URLs HTTPS para levar o lead para checkout, grupo ou pagina.</p>
        </div>
        <button
          type="button"
          disabled={buttons.length >= 5}
          onClick={() => onChange([...buttons, { label: '', url: '' }])}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-neon-purple/30 bg-neon-purple/10 text-neon-purple hover:bg-neon-purple/15 disabled:opacity-40"
        >
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {buttons.length === 0 && <p className="text-sm text-gray-500">Nenhum botao adicionado.</p>}
        {buttons.map((button, index) => (
          <div key={index} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1.4fr_auto]">
            <input
              value={button.label}
              onChange={(event) => {
                const next = [...buttons]
                next[index] = { ...button, label: event.target.value }
                onChange(next)
              }}
              placeholder="Texto do botao"
              className={inputClass}
            />
            <input
              value={button.url}
              onChange={(event) => {
                const next = [...buttons]
                next[index] = { ...button, url: event.target.value }
                onChange(next)
              }}
              placeholder="https://..."
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => onChange(buttons.filter((_, itemIndex) => itemIndex !== index))}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-300"
            >
              <Trash2 size={17} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function UploadPanel({
  icon: Icon,
  title,
  description,
  asset,
  uploading,
  onChoose,
  onClear,
}: {
  icon: LucideIcon
  title: string
  description: string
  asset: MailingAssetInput
  uploading: boolean
  onChoose: () => void
  onClear: () => void
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-neon-purple/30 bg-neon-purple/10 text-neon-purple">
          <Icon size={22} aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-black text-white">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      {asset.name ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <span className="min-w-0 truncate text-sm font-bold text-gray-200">{asset.name}</span>
          <button type="button" onClick={onClear} className="text-red-300">
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={onChoose} disabled={uploading} className="mt-4 rounded-full border-white/10 bg-white/5 text-gray-200">
          {uploading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <FileVideo size={16} className="mr-2" />}
          Escolher arquivo
        </Button>
      )}
    </div>
  )
}

function TogglePanel({
  title,
  description,
  checked,
  onChange,
  children,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-white">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-gray-500">{description}</p>
        </div>
        <button
          type="button"
          aria-pressed={checked}
          onClick={() => onChange(!checked)}
          className={cn(
            'h-8 w-14 rounded-full border p-1 transition',
            checked ? 'border-neon-purple/50 bg-neon-purple/40' : 'border-white/15 bg-white/10',
          )}
        >
          <span
            className={cn(
              'block h-5 w-5 rounded-full bg-white transition',
              checked ? 'translate-x-6' : 'translate-x-0',
            )}
          />
        </button>
      </div>
      {children}
    </div>
  )
}

function Field({ label, children, footer }: { label: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-gray-200">{label}</span>
      {children}
      {footer && <div className="mt-3">{footer}</div>}
    </label>
  )
}

function EmptyState({ disabled, onCreate }: { disabled: boolean; onCreate: () => void }) {
  return (
    <section className="flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-white/10 bg-surface-2 p-8 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-neon-purple/30 bg-neon-purple/12 text-neon-purple">
        <Mail size={40} aria-hidden="true" />
      </span>
      <h3 className="mt-6 text-3xl font-black text-white">Nenhum mailing criado</h3>
      <p className="mt-3 max-w-xl text-base leading-7 text-gray-500">
        Crie seu primeiro mailing para falar com leads ativos do bot usando publico real,
        variaveis e historico de envio.
      </p>
      <Button type="button" variant="neonGradient" size="cta" disabled={disabled} onClick={onCreate} className="mt-7 px-8 font-bold">
        <Plus size={20} className="mr-2" aria-hidden="true" />
        Criar Primeiro Mailing
      </Button>
    </section>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-surface-2 p-5">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-neon-purple/30 bg-neon-purple/12 text-neon-purple">
          <Icon size={22} aria-hidden="true" />
        </span>
        <div>
          <div className="text-sm font-bold text-gray-500">{label}</div>
          <div className="mt-1 text-3xl font-black text-white">{value}</div>
        </div>
      </div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">{label}</div>
      <div className="mt-2 text-xl font-black text-white">{value}</div>
    </div>
  )
}

function StatusPill({ status }: { status: MailingCampaign['status'] }) {
  const style =
    status === 'sent'
      ? 'border-neon-green/35 bg-neon-green/10 text-neon-green'
      : status === 'scheduled' || status === 'sending'
        ? 'border-neon-blue/35 bg-neon-blue/10 text-neon-blue'
        : status === 'failed'
          ? 'border-red-500/35 bg-red-500/10 text-red-300'
          : 'border-neon-purple/35 bg-neon-purple/10 text-neon-purple'

  return (
    <span className={cn('rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em]', style)}>
      {getStatusLabel(status)}
    </span>
  )
}

function Notice({ tone, children }: { tone: 'orange' | 'purple'; children: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-[22px] border px-5 py-4 text-sm font-bold leading-6',
        tone === 'orange'
          ? 'border-neon-orange/30 bg-neon-orange/10 text-neon-orange'
          : 'border-neon-purple/30 bg-neon-purple/10 text-neon-purple',
      )}
    >
      {children}
    </div>
  )
}

function renderPreviewText(message: string) {
  return message
    .replace(/\{profile_name\}/gi, 'Joao')
    .replace(/\{country\}/gi, 'Brasil')
    .replace(/\{state\}/gi, 'AM')
    .replace(/\{city\}/gi, 'Manaus')
}

function getStatusLabel(status: MailingCampaign['status']) {
  const labels: Record<MailingCampaign['status'], string> = {
    draft: 'Rascunho',
    ready: 'Pronto',
    scheduled: 'Agendado',
    sending: 'Enviando',
    sent: 'Enviado',
    paused: 'Pausado',
    failed: 'Falhou',
    canceled: 'Cancelado',
  }
  return labels[status]
}

function toLocalInputValue(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value)
}

function normalizeError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}
