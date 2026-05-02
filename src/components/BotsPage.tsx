import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  AtSign,
  Bot as BotIcon,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
  Power,
  Server,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  connectTelegramBot,
  deleteBot,
  fetchTelegramBotPhotoUrl,
  listBots,
  validateTelegramBotToken,
  type Bot,
  type TelegramBotPreview,
} from '@/lib/api/bots'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface BotsPageProps {
  selectedBotId: string | null
  onSelectBot: (id: string | null) => void
}

interface BotMetrics {
  leads: number
  sales: number
  flowName: string | null
}

type BotsView = 'list' | 'connect'

const emptyMetrics: BotMetrics = { leads: 0, sales: 0, flowName: null }

export default function BotsPage({ selectedBotId, onSelectBot }: BotsPageProps) {
  const [view, setView] = useState<BotsView>('list')
  const [bots, setBots] = useState<Bot[]>([])
  const [metrics, setMetrics] = useState<Record<string, BotMetrics>>({})
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const photoUrlsRef = useRef<Record<string, string>>({})

  useEffect(() => {
    void refresh()
    return () => {
      Object.values(photoUrlsRef.current).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const data = await listBots()
      setBots(data)
      setMetrics(await loadBotMetrics(data))
      void loadBotPhotos(data)

      if (!selectedBotId && data[0]) {
        onSelectBot(data[0].id)
      }

      if (selectedBotId && !data.some((bot) => bot.id === selectedBotId)) {
        onSelectBot(data[0]?.id ?? null)
      }
    } catch (err) {
      setError(normalizeError(err))
    } finally {
      setLoading(false)
    }
  }

  async function loadBotPhotos(nextBots: Bot[]) {
    const entries = await Promise.all(
      nextBots.map(async (bot) => {
        if (!bot.telegram_bot_id) return null

        try {
          const url = await fetchTelegramBotPhotoUrl(bot.id)
          return url ? ([bot.id, url] as const) : null
        } catch {
          return null
        }
      }),
    )

    const nextUrls = Object.fromEntries(entries.filter(Boolean) as Array<readonly [string, string]>)
    Object.values(photoUrlsRef.current).forEach((url) => URL.revokeObjectURL(url))
    photoUrlsRef.current = nextUrls
    setPhotoUrls(nextUrls)
  }

  async function handleDelete(bot: Bot) {
    if (!window.confirm(`Desconectar o bot "${bot.name}"? O webhook sera removido no Telegram.`)) return

    setError(null)
    try {
      await deleteBot(bot.id)
      await refresh()
    } catch (err) {
      setError(normalizeError(err))
    }
  }

  const stats = useMemo(() => {
    const active = bots.filter((bot) => isBotOnline(bot)).length
    return {
      total: bots.length,
      active,
      inactive: Math.max(0, bots.length - active),
    }
  }, [bots])

  if (view === 'connect') {
    return (
      <ConnectBotView
        onBack={() => setView('list')}
        onConnected={async (bot) => {
          onSelectBot(bot.id)
          setView('list')
          await refresh()
        }}
      />
    )
  }

  return (
    <main className="space-y-6 p-6">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-white">Meus Robos</h2>
          <p className="mt-2 border-l border-white/10 pl-4 text-base text-gray-500">
            Gerencie seus bots do Telegram
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setView('connect')}
          disabled={bots.length >= 50}
          className="h-12 rounded-[14px] border border-white/10 bg-surface-2 px-7 text-sm font-black text-white shadow-[0_0_18px_rgba(180,77,255,0.12)] hover:border-neon-purple/45 hover:bg-neon-purple/15"
        >
          Conectar Bot ({bots.length}/50)
        </Button>
      </section>

      {error && (
        <div className="rounded-2xl border border-neon-orange/30 bg-neon-orange/10 px-4 py-3 text-sm leading-6 text-neon-orange">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SummaryCard icon={BotIcon} label="Total de bots" value={`${stats.total} Bots`} tone="purple" />
        <SummaryCard icon={CheckCircle2} label="Bots ativos" value={`${stats.active} Bots`} tone="green" />
        <SummaryCard icon={Power} label="Bots inativos" value={`${stats.inactive} Bots`} tone="muted" />
      </section>

      {loading && (
        <div className="flex min-h-[340px] items-center justify-center rounded-[18px] border border-white/10 bg-surface-1 text-gray-500">
          <Loader2 size={20} className="mr-3 animate-spin" aria-hidden="true" />
          Carregando bots...
        </div>
      )}

      {!loading && (
        <section className="grid grid-cols-[repeat(auto-fill,minmax(280px,380px))] gap-5">
          {bots.map((bot) => (
            <BotCard
              key={bot.id}
              bot={bot}
              metrics={metrics[bot.id] ?? emptyMetrics}
              photoUrl={photoUrls[bot.id] ?? null}
              selected={bot.id === selectedBotId}
              onSelect={() => onSelectBot(bot.id)}
              onDelete={() => void handleDelete(bot)}
            />
          ))}

          <button
            type="button"
            onClick={() => setView('connect')}
            disabled={bots.length >= 50}
            className="flex min-h-[356px] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-surface-1 p-6 text-center transition-colors hover:border-neon-purple/35 hover:bg-neon-purple/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-500">
              <Plus size={42} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className="mt-8 text-base font-black text-gray-500">Conectar Novo Bot</span>
          </button>
        </section>
      )}
    </main>
  )
}

function ConnectBotView({
  onBack,
  onConnected,
}: {
  onBack: () => void
  onConnected: (bot: Bot) => void | Promise<void>
}) {
  const [token, setToken] = useState('')
  const [preview, setPreview] = useState<TelegramBotPreview | null>(null)
  const [validating, setValidating] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleValidate() {
    setValidating(true)
    setError(null)
    setPreview(null)

    try {
      const bot = await validateTelegramBotToken(token)
      setPreview(bot)
    } catch (err) {
      setError(normalizeError(err))
    } finally {
      setValidating(false)
    }
  }

  async function handleConnect() {
    setConnecting(true)
    setError(null)

    try {
      const bot = await connectTelegramBot(token)
      await onConnected(bot)
    } catch (err) {
      setError(normalizeError(err))
    } finally {
      setConnecting(false)
    }
  }

  return (
    <main className="space-y-8 p-6">
      <section className="flex items-start gap-5">
        <button
          type="button"
          onClick={onBack}
          className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-surface-1 text-white transition-colors hover:border-neon-purple/35 hover:text-neon-purple"
          aria-label="Voltar para Meus Robos"
        >
          <ArrowLeft size={23} aria-hidden="true" />
        </button>
        <div>
          <h2 className="text-4xl font-black tracking-tight text-white">Criar Novo Bot</h2>
          <p className="mt-2 border-l border-white/10 pl-4 text-base text-gray-500">
            Configure seu bot do Telegram
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.66fr)]">
        <section className="overflow-hidden rounded-[18px] border border-white/10 bg-surface-1">
          <div className="flex items-center gap-4 border-b border-white/10 px-7 py-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-purple/25 bg-neon-purple/10 text-neon-purple">
              <Server size={18} aria-hidden="true" />
            </span>
            <p className="text-[12px] font-black uppercase tracking-[0.22em] text-gray-500">
              Configuracao do bot
            </p>
          </div>

          <div className="space-y-8 p-7">
            <div className="space-y-3">
              <label htmlFor="telegram-token" className="text-base font-black text-white">
                Token do Bot <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-col gap-3 lg:flex-row">
                <Input
                  id="telegram-token"
                  type="password"
                  value={token}
                  onChange={(event) => {
                    setToken(event.target.value)
                    setPreview(null)
                    setError(null)
                  }}
                  placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                  className="h-14 rounded-[14px] border-white/10 !bg-[#05060a] font-mono !text-white placeholder:text-gray-700 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] [color-scheme:dark] focus-visible:ring-neon-purple/70"
                />
                <Button
                  type="button"
                  onClick={handleValidate}
                  disabled={!token.trim() || validating || connecting}
                  className="h-14 rounded-[14px] border border-neon-purple/35 bg-neon-purple/15 px-6 font-black text-neon-purple hover:bg-neon-purple/25"
                >
                  {validating && <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" />}
                  Validar Token
                </Button>
              </div>
              <p className="text-sm text-gray-500">Token fornecido pelo @BotFather</p>
            </div>

            <BotInfoField label="Nome do Bot" value={preview?.first_name ?? ''} placeholder="Preenchido automaticamente" />
            <BotInfoField
              label="Username do Bot"
              value={preview?.username ? `@${preview.username}` : ''}
              placeholder="@ preenchido_automaticamente"
              icon={AtSign}
            />

            {preview && (
              <div className="rounded-[16px] border border-neon-green/20 bg-neon-green/10 px-5 py-4 text-sm font-bold text-neon-green">
                Token validado: {preview.first_name}
                {preview.username ? ` (@${preview.username})` : ''} foi encontrado no Telegram.
              </div>
            )}

            {error && (
              <div className="rounded-[16px] border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm leading-6 text-red-200">
                {error}
              </div>
            )}

            <div className="flex items-start gap-4 rounded-[14px] border border-neon-orange/25 bg-neon-orange/10 px-5 py-5">
              <ShieldAlert size={23} className="mt-1 shrink-0 text-neon-orange" aria-hidden="true" />
              <div>
                <p className="font-black text-neon-orange">Mantenha seu token seguro!</p>
                <p className="mt-1 text-sm leading-6 text-neon-orange/90">
                  Nunca compartilhe o token do seu bot. Ele sera enviado apenas para a API da Vercel e nao sera exibido novamente no painel.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 pt-7 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={connecting}
                className="h-12 rounded-[14px] border-white/10 bg-white/5 px-8 font-black text-gray-400 hover:bg-white/10 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConnect}
                disabled={!preview || connecting}
                variant="neonGradient"
                className="h-12 rounded-[14px] border-neon-purple/55 px-8 font-black"
              >
                {connecting && <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" />}
                Criar Bot
              </Button>
            </div>
          </div>
        </section>

        <TutorialPanel />
      </div>
    </main>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof BotIcon
  label: string
  value: string
  tone: 'purple' | 'green' | 'muted'
}) {
  const toneClass = {
    purple: 'border-neon-purple/25 bg-neon-purple/10 text-neon-purple',
    green: 'border-neon-green/25 bg-neon-green/10 text-neon-green',
    muted: 'border-white/10 bg-white/5 text-gray-500',
  }[tone]

  return (
    <article className="rounded-[16px] border border-white/10 bg-surface-1 px-6 py-6">
      <div className="flex items-center gap-4">
        <span className={cn('flex h-12 w-12 items-center justify-center rounded-xl border', toneClass)}>
          <Icon size={21} aria-hidden="true" />
        </span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-600">{label}</p>
          <p className="mt-1 text-2xl font-black text-white">{value}</p>
        </div>
      </div>
    </article>
  )
}

function BotCard({
  bot,
  metrics,
  photoUrl,
  selected,
  onSelect,
  onDelete,
}: {
  bot: Bot
  metrics: BotMetrics
  photoUrl: string | null
  selected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const online = isBotOnline(bot)
  const displayName = bot.telegram_first_name || bot.name
  const username = bot.telegram_username ? `@${bot.telegram_username}` : 'sem username'

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-[28px] border bg-surface-1 transition-all duration-200',
        selected
          ? 'border-neon-purple/55 shadow-[0_0_26px_rgba(180,77,255,0.16)]'
          : 'border-white/10 hover:border-neon-purple/30 hover:shadow-[0_0_18px_rgba(180,77,255,0.08)]',
      )}
    >
      <div className="absolute right-4 top-4 z-10 flex flex-col items-end gap-3">
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase backdrop-blur',
            online
              ? 'border-neon-green/25 bg-neon-green/10 text-neon-green'
              : 'border-white/10 bg-white/5 text-gray-500',
          )}
        >
          <span className={cn('h-2 w-2 rounded-full', online ? 'bg-neon-green' : 'bg-gray-600')} />
          {online ? 'Online' : 'Inativo'}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-neon-green/20 bg-neon-green/10 px-3 py-1.5 text-neon-green backdrop-blur">
          <Server size={13} aria-hidden="true" />
          <span className="h-2 w-2 rounded-full bg-neon-green" />
        </span>
      </div>

      <button type="button" onClick={onSelect} className="block w-full px-6 pb-6 pt-7 text-center">
        <div className="mx-auto flex w-full max-w-[230px] flex-col items-center">
          <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br from-neon-purple/20 to-neon-magenta/10 text-3xl font-black text-white shadow-[0_0_24px_rgba(180,77,255,0.16)]">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={`Foto do bot ${displayName}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              getInitials(displayName)
            )}
          </span>
          <h3 className="mt-5 w-full truncate text-xl font-black text-white">{displayName}</h3>
          <span className="mt-3 max-w-full truncate rounded-full border border-white/10 bg-black/30 px-3 py-1 font-mono text-sm font-bold text-white">
            {username}
          </span>
        </div>
      </button>

      <div className="grid grid-cols-2 border-y border-white/10">
        <BotStat label="Leads" value={metrics.leads} />
        <BotStat label="Vendas" value={metrics.sales} />
      </div>

      <div className="flex items-center justify-between gap-3 px-6 py-4">
        <div className="flex min-w-0 items-center gap-2 text-sm font-black text-white">
          <span className="font-mono text-neon-purple">&gt;_</span>
          <span className="truncate">{metrics.flowName ?? 'Nenhum fluxo ativo'}</span>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg p-2 text-gray-600 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100 focus:opacity-100"
          aria-label={`Desconectar ${displayName}`}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </article>
  )
}

function BotStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-r border-white/10 px-5 py-4 text-center last:border-r-0">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-600">{label}</p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  )
}

function BotInfoField({
  label,
  value,
  placeholder,
  icon: Icon,
}: {
  label: string
  value: string
  placeholder: string
  icon?: typeof AtSign
}) {
  const hasValue = value.trim().length > 0

  return (
    <div className="space-y-3">
      <label className="text-base font-black text-white">
        {label} <span className="text-red-400">*</span>
      </label>
      <div
        className={cn(
          'relative flex min-h-14 items-center rounded-[14px] border border-white/10 bg-[#05060a] px-5 text-base shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]',
          Icon && 'pl-12',
          hasValue ? 'font-black text-white' : 'font-semibold text-gray-700',
        )}
      >
        {Icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">
            <Icon size={18} aria-hidden="true" />
          </span>
        )}
        <span className="truncate">{hasValue ? value : placeholder}</span>
      </div>
      <p className="text-sm text-gray-500">Preenchido automaticamente pelo token</p>
    </div>
  )
}

function TutorialPanel() {
  return (
    <aside className="rounded-[18px] border border-white/10 bg-surface-1 p-7">
      <h3 className="text-2xl font-black text-white">Tutorial: Criar Bot no Telegram</h3>
      <p className="mt-4 text-base text-gray-500">Siga estes passos para criar seu bot no Telegram:</p>

      <div className="mt-8 space-y-7">
        <TutorialStep index={1} title="Abra o BotFather no Telegram">
          <p>Clique no link abaixo ou procure por @BotFather no Telegram:</p>
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-sm font-black text-white hover:text-neon-purple"
          >
            t.me/BotFather <ExternalLink size={13} aria-hidden="true" />
          </a>
        </TutorialStep>
        <TutorialStep index={2} title="Envie o comando /newbot">
          <p>No chat com o BotFather, digite o comando:</p>
          <code className="mt-3 inline-flex rounded-lg border border-white/10 bg-black/40 px-4 py-2 text-neon-purple">
            /newbot
          </code>
        </TutorialStep>
        <TutorialStep index={3} title="Defina o nome do bot">
          <p>Digite o nome completo do bot, por exemplo: Meu Bot de Vendas.</p>
        </TutorialStep>
        <TutorialStep index={4} title="Defina o username do bot">
          <p>O username precisa ser unico e terminar com bot, como empresa123_bot.</p>
        </TutorialStep>
        <TutorialStep index={5} title="Copie o token">
          <p>Cole aqui o token enviado pelo BotFather. Nome e username serao preenchidos automaticamente.</p>
          <p className="mt-3 font-black text-neon-green">O nome e username serao preenchidos automaticamente!</p>
        </TutorialStep>
      </div>
    </aside>
  )
}

function TutorialStep({
  index,
  title,
  children,
}: {
  index: number
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex gap-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neon-purple/25 bg-neon-purple/10 text-sm font-black text-white">
        {index}
      </span>
      <div>
        <h4 className="font-black text-white">{title}</h4>
        <div className="mt-2 text-sm leading-6 text-gray-500">{children}</div>
      </div>
    </div>
  )
}

async function loadBotMetrics(bots: Bot[]) {
  if (bots.length === 0) return {}

  const botIds = bots.map((bot) => bot.id)
  const [leadsResponse, flowsResponse] = await Promise.all([
    supabase.from('telegram_leads').select('bot_id,status').in('bot_id', botIds),
    supabase.from('flows').select('bot_id,name,status').in('bot_id', botIds).eq('status', 'active'),
  ])

  const nextMetrics = bots.reduce<Record<string, BotMetrics>>((acc, bot) => {
    acc[bot.id] = { ...emptyMetrics }
    return acc
  }, {})

  ;(leadsResponse.data ?? []).forEach((lead) => {
    if (!lead.bot_id || !nextMetrics[lead.bot_id]) return
    nextMetrics[lead.bot_id].leads += 1
    if (lead.status === 'pago') {
      nextMetrics[lead.bot_id].sales += 1
    }
  })

  ;(flowsResponse.data ?? []).forEach((flow) => {
    if (!flow.bot_id || !nextMetrics[flow.bot_id]) return
    nextMetrics[flow.bot_id].flowName = flow.name ?? null
  })

  return nextMetrics
}

function isBotOnline(bot: Bot) {
  return bot.connection_status === 'active' && Boolean(bot.webhook_enabled)
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'BT'
}

function normalizeError(err: unknown) {
  const message = err instanceof Error ? err.message : 'Falha ao carregar bots.'

  if (/telegram_bot_id|connection_status|bot_secrets|schema cache|column .* does not exist/i.test(message)) {
    return 'A conexao real de bots precisa da migration supabase/migrations/20260430000200_telegram_bot_connection.sql aplicada no Supabase.'
  }

  return message
}
