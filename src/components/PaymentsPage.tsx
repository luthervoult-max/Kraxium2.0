import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Globe2,
  KeyRound,
  Landmark,
  Link2,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Smartphone,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { listFlowsWithBots, type FlowWithBot } from '@/lib/api/flows'
import {
  connectPaymentGateway,
  disconnectPaymentGateway,
  listPaymentGatewayConnections,
  type ConnectPaymentGatewayInput,
  type PaymentGatewayConnection,
  type PaymentGatewayProvider,
  type PaymentGatewayScope,
} from '@/lib/api/paymentGateways'
import { cn } from '@/lib/utils'

type GatewayMethod = 'pix' | 'card'
type GatewayFilter = 'all' | GatewayMethod

interface GatewayDefinition {
  id: PaymentGatewayProvider
  name: string
  description: string
  methods: GatewayMethod[]
  icon: LucideIcon
  initials: string
}

const gateways: GatewayDefinition[] = [
  {
    id: 'mercado_pago',
    name: 'Mercado Pago',
    description: 'PIX e cartão pelo ecossistema Mercado Livre.',
    methods: ['pix', 'card'],
    icon: WalletCards,
    initials: 'MP',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Cartão internacional com Connect/OAuth.',
    methods: ['card'],
    icon: CreditCard,
    initials: 'ST',
  },
  {
    id: 'pushinpay',
    name: 'PushinPay',
    description: 'Gateway focado em pagamentos via PIX.',
    methods: ['pix'],
    icon: Landmark,
    initials: 'PP',
  },
  {
    id: 'syncpay',
    name: 'SyncPay',
    description: 'PIX com credenciais Client ID e Secret.',
    methods: ['pix'],
    icon: Smartphone,
    initials: 'SP',
  },
]

const filters: Array<{ id: GatewayFilter; label: string; icon: LucideIcon }> = [
  { id: 'all', label: 'Todos', icon: Globe2 },
  { id: 'pix', label: 'PIX', icon: Smartphone },
  { id: 'card', label: 'Cartão', icon: CreditCard },
]

const stripeCurrencies = [
  { code: 'BRL', label: 'Real', symbol: 'R$' },
  { code: 'USD', label: 'Dolar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: 'EUR' },
  { code: 'GBP', label: 'Libra', symbol: 'GBP' },
]

export default function PaymentsPage() {
  const [connections, setConnections] = useState<PaymentGatewayConnection[]>([])
  const [flows, setFlows] = useState<FlowWithBot[]>([])
  const [filter, setFilter] = useState<GatewayFilter>('all')
  const [activeGateway, setActiveGateway] = useState<GatewayDefinition | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [nextConnections, nextFlows] = await Promise.all([
          listPaymentGatewayConnections(),
          listFlowsWithBots().catch(() => [] as FlowWithBot[]),
        ])

        if (!cancelled) {
          setConnections(nextConnections)
          setFlows(nextFlows)
        }
      } catch (err) {
        if (!cancelled) {
          setError(normalizeError(err))
          setConnections([])
          setFlows([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const connectionMap = useMemo(
    () => new Map(connections.map((connection) => [connection.provider, connection])),
    [connections],
  )

  const filteredGateways = useMemo(
    () =>
      gateways.filter((gateway) => filter === 'all' || gateway.methods.includes(filter)),
    [filter],
  )

  const connectedCount = connections.filter((connection) => connection.status === 'connected').length
  const pendingCount = connections.filter((connection) => connection.status === 'pending_oauth').length

  async function handleSaveGateway(input: ConnectPaymentGatewayInput) {
    const saved = await connectPaymentGateway(input)
    setConnections((current) => [
      saved,
      ...current.filter((connection) => connection.provider !== saved.provider),
    ])
  }

  async function handleDisconnectGateway(provider: PaymentGatewayProvider) {
    await disconnectPaymentGateway(provider)
    setConnections((current) => current.filter((connection) => connection.provider !== provider))
  }

  return (
    <main className="space-y-6 p-6">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-white">Pagamentos</h2>
          <p className="mt-2 border-l border-white/10 pl-4 text-base leading-6 text-gray-500">
            Conecte gateways para receber em fluxos. Esta etapa prepara as credenciais; cobranças
            reais entram na próxima fase segura.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:flex">
          <PaymentStat label="Conectados" value={connectedCount} />
          <PaymentStat label="Pendentes" value={pendingCount} />
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-neon-orange/30 bg-neon-orange/10 px-4 py-3 text-sm leading-6 text-neon-orange">
          {error}
        </div>
      )}

      <section className="rounded-[18px] border border-white/10 bg-[#0c0d10] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-neon-purple/25 bg-neon-purple/10 text-neon-purple">
              <Globe2 size={20} aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-xl font-black text-white">Gateways Disponíveis</h3>
              <p className="mt-1 text-sm text-gray-500">Mercado Pago, Stripe, PushinPay e SyncPay.</p>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            {filters.map((item) => {
              const Icon = item.icon
              const active = filter === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={cn(
                    'flex h-10 shrink-0 items-center gap-2 rounded-[10px] border px-4 text-sm font-black transition-colors',
                    active
                      ? 'border-neon-purple/45 bg-neon-purple/15 text-neon-purple shadow-[0_0_18px_rgba(180,77,255,0.14)]'
                      : 'border-white/10 bg-[#08090b] text-gray-500 hover:border-neon-purple/30 hover:text-white',
                  )}
                >
                  <Icon size={15} aria-hidden="true" />
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        {loading && (
          <div className="mt-5 flex min-h-[260px] items-center justify-center rounded-[16px] border border-white/10 bg-[#08090b] text-gray-500">
            <Loader2 size={20} className="mr-3 animate-spin" aria-hidden="true" />
            Carregando gateways...
          </div>
        )}

        {!loading && (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {filteredGateways.map((gateway) => (
              <GatewayCard
                key={gateway.id}
                gateway={gateway}
                connection={connectionMap.get(gateway.id) ?? null}
                onConfigure={() => setActiveGateway(gateway)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <InfoTile
          icon={ShieldCheck}
          label="Credenciais protegidas"
          text="Chaves sao enviadas para API server-side e criptografadas antes de salvar."
        />
        <InfoTile
          icon={Link2}
          label="Escopo por fluxo"
          text="Use um gateway global ou limite a conexão para fluxos específicos."
        />
        <InfoTile
          icon={KeyRound}
          label="Split futuro"
          text="A comissão da plataforma será aplicada na etapa de cobrança real."
        />
      </section>

      {activeGateway && (
        <GatewayConfigModal
          key={activeGateway.id}
          gateway={activeGateway}
          connection={connectionMap.get(activeGateway.id) ?? null}
          flows={flows}
          onClose={() => setActiveGateway(null)}
          onSave={handleSaveGateway}
          onDisconnect={handleDisconnectGateway}
        />
      )}
    </main>
  )
}

function PaymentStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[14px] border border-white/10 bg-[#0c0d10] px-5 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-600">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  )
}

function GatewayCard({
  gateway,
  connection,
  onConfigure,
}: {
  gateway: GatewayDefinition
  connection: PaymentGatewayConnection | null
  onConfigure: () => void
}) {
  const Icon = gateway.icon
  const status = getStatusMeta(connection)

  return (
    <article className="group relative min-h-[250px] rounded-[18px] border border-white/10 bg-[#08090b] p-5 transition-colors hover:border-neon-purple/35">
      <button
        type="button"
        onClick={onConfigure}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-gray-500 transition-colors hover:border-neon-purple/40 hover:text-neon-purple"
        aria-label={`Configurar ${gateway.name}`}
        title={`Configurar ${gateway.name}`}
      >
        <Plus size={17} aria-hidden="true" />
      </button>

      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-[18px] border border-neon-purple/30 bg-neon-purple/10 text-neon-purple shadow-[0_0_24px_rgba(180,77,255,0.14)]">
          <Icon size={28} aria-hidden="true" />
          <span className="absolute -bottom-2 rounded-full border border-neon-purple/35 bg-[#0c0d10] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-neon-purple">
            {gateway.initials}
          </span>
        </div>

        <h4 className="mt-7 text-xl font-black text-white">{gateway.name}</h4>
        <p className="mt-2 min-h-[42px] max-w-[240px] text-sm leading-5 text-gray-500">{gateway.description}</p>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {gateway.methods.map((method) => (
            <MethodBadge key={method} method={method} />
          ))}
        </div>

        <div className={cn('mt-4 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]', status.className)}>
          {status.label}
        </div>
      </div>
    </article>
  )
}

function MethodBadge({ method }: { method: GatewayMethod }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-neon-purple/25 bg-neon-purple/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-neon-purple">
      {method === 'pix' ? <Smartphone size={12} aria-hidden="true" /> : <CreditCard size={12} aria-hidden="true" />}
      {method === 'pix' ? 'PIX' : 'Cartão'}
    </span>
  )
}

function InfoTile({
  icon: Icon,
  label,
  text,
}: {
  icon: LucideIcon
  label: string
  text: string
}) {
  return (
    <div className="rounded-[16px] border border-white/10 bg-[#0c0d10] p-5">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-neon-purple/25 bg-neon-purple/10 text-neon-purple">
          <Icon size={19} aria-hidden="true" />
        </span>
        <div>
          <h4 className="text-sm font-black text-white">{label}</h4>
          <p className="mt-2 text-sm leading-6 text-gray-500">{text}</p>
        </div>
      </div>
    </div>
  )
}

function GatewayConfigModal({
  gateway,
  connection,
  flows,
  onClose,
  onSave,
  onDisconnect,
}: {
  gateway: GatewayDefinition
  connection: PaymentGatewayConnection | null
  flows: FlowWithBot[]
  onClose: () => void
  onSave: (input: ConnectPaymentGatewayInput) => Promise<void>
  onDisconnect: (provider: PaymentGatewayProvider) => Promise<void>
}) {
  const [scope, setScope] = useState<PaymentGatewayScope>(connection?.scope ?? 'global')
  const [selectedFlowIds, setSelectedFlowIds] = useState<string[]>(connection?.flowIds ?? [])
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [currencies, setCurrencies] = useState<string[]>(
    Array.isArray(connection?.publicConfig.currencies)
      ? (connection?.publicConfig.currencies as string[])
      : ['BRL'],
  )
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const Icon = gateway.icon

  const hasExistingConnection = Boolean(connection)
  const hasTypedCredential = Object.values(credentials).some(Boolean)
  const credentialMissing = isCredentialMissing(gateway.id, credentials, hasExistingConnection, hasTypedCredential)
  const scopeMissing = scope === 'specific' && selectedFlowIds.length === 0
  const currencyMissing = gateway.id === 'stripe' && currencies.length === 0
  const canSave = !saving && !scopeMissing && !credentialMissing && !currencyMissing

  function updateCredential(key: string, value: string) {
    setCredentials((current) => ({ ...current, [key]: value }))
  }

  function toggleFlow(flowId: string) {
    setSelectedFlowIds((current) =>
      current.includes(flowId)
        ? current.filter((item) => item !== flowId)
        : [...current, flowId],
    )
  }

  function toggleCurrency(code: string) {
    setCurrencies((current) =>
      current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code],
    )
  }

  async function handleSave() {
    if (!canSave) {
      setError(
        scopeMissing
          ? 'Selecione pelo menos um fluxo para o escopo específico.'
          : currencyMissing
            ? 'Selecione pelo menos uma moeda para o Stripe.'
            : 'Preencha as credenciais obrigatorias antes de salvar.',
      )
      return
    }

    setSaving(true)
    setError(null)

    try {
      await onSave({
        provider: gateway.id,
        scope,
        flowIds: scope === 'specific' ? selectedFlowIds : [],
        credentials,
        publicConfig: {
          methods: gateway.methods,
          ...(gateway.id === 'stripe' ? { currencies } : {}),
        },
      })
      onClose()
    } catch (err) {
      setError(normalizeError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    setError(null)

    try {
      await onDisconnect(gateway.id)
      onClose()
    } catch (err) {
      setError(normalizeError(err))
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-gateway-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-[24px] border border-white/10 bg-[#111111] shadow-[0_24px_90px_rgba(0,0,0,0.65)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-neon-purple/25 bg-neon-purple/10 text-neon-purple">
              <Icon size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="payment-gateway-title" className="text-2xl font-black text-white">
                Configurar {gateway.name}
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                {gateway.id === 'stripe'
                  ? 'Conecte sua conta para receber pagamentos via cartão internacional.'
                  : 'Configure sua chave de API para começar a receber pagamentos.'}
              </p>
              {connection?.credentialsHint && (
                <p className="mt-2 text-xs font-bold text-neon-purple">
                  Credencial salva: {connection.credentialsHint}
                </p>
              )}
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

        <div className="space-y-6 overflow-y-auto p-6">
          {gateway.id === 'stripe' ? (
            <StripeSetup currencies={currencies} onToggleCurrency={toggleCurrency} />
          ) : (
            <CredentialFields
              provider={gateway.id}
              credentials={credentials}
              onChange={updateCredential}
            />
          )}

          <section>
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-white/10" />
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-gray-600">
                <Link2 size={14} aria-hidden="true" />
                Escopo do Gateway
              </p>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ScopeButton
                active={scope === 'global'}
                icon={Globe2}
                label="Global"
                text="Todos os fluxos"
                onClick={() => setScope('global')}
              />
              <ScopeButton
                active={scope === 'specific'}
                icon={Link2}
                label="Específico"
                text="Fluxos escolhidos"
                onClick={() => setScope('specific')}
              />
            </div>

            {scope === 'specific' && (
              <div className="mt-4 rounded-[16px] border border-white/10 bg-[#0c0d10] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-white">Fluxos que podem usar este gateway</p>
                  <span className="text-xs font-bold text-gray-600">
                    {selectedFlowIds.length} selecionado(s)
                  </span>
                </div>

                {flows.length === 0 ? (
                  <p className="text-sm leading-6 text-gray-500">
                    Nenhum fluxo salvo ainda. Crie um fluxo para liberar o escopo específico.
                  </p>
                ) : (
                  <div className="grid max-h-48 gap-2 overflow-y-auto pr-1">
                    {flows.map((flow) => (
                      <label
                        key={flow.id}
                        className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-white/10 bg-white/[0.025] px-3 py-3 transition-colors hover:border-neon-purple/30"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFlowIds.includes(flow.id)}
                          onChange={() => toggleFlow(flow.id)}
                          className="h-4 w-4 accent-[#b44dff]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black text-white">
                            {flow.name || 'Fluxo sem nome'}
                          </span>
                          <span className="mt-1 block truncate text-xs text-gray-600">
                            {flow.bot?.name ?? 'Sem bot vinculado'}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 rounded-[16px] border border-white/10 bg-white/[0.025] px-4 py-4 text-sm leading-6 text-gray-400">
              <CheckCircle2 size={17} className="mr-2 inline text-gray-500" aria-hidden="true" />
              Este gateway será usado para{' '}
              <strong className="text-white">
                {scope === 'global' ? 'todos os seus fluxos' : 'os fluxos selecionados'}
              </strong>
              . Checkouts serão conectados em uma etapa futura.
            </div>
          </section>

          {error && (
            <div className="rounded-[14px] border border-neon-orange/30 bg-neon-orange/10 px-4 py-3 text-sm leading-6 text-neon-orange">
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 p-5 sm:flex-row sm:justify-end">
          {connection && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleDisconnect()}
              disabled={disconnecting || saving}
              className="rounded-full border-red-500/20 bg-red-500/5 px-5 font-black text-red-300 hover:bg-red-500/10"
            >
              {disconnecting ? 'Removendo...' : 'Desconectar'}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving || disconnecting}
            className="rounded-full border-white/10 bg-black/40 px-5 font-black text-gray-200 hover:bg-white/10"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canSave || saving || disconnecting}
            className="rounded-full border border-neon-purple/70 bg-[linear-gradient(90deg,#b44dff,#ff2a9d)] px-6 font-black text-white shadow-[0_0_18px_rgba(180,77,255,0.25)] hover:opacity-95 disabled:opacity-45"
          >
            {saving ? <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" /> : <Save size={16} className="mr-2" aria-hidden="true" />}
            Salvar
          </Button>
        </div>
      </div>
    </div>
  )
}

function CredentialFields({
  provider,
  credentials,
  onChange,
}: {
  provider: PaymentGatewayProvider
  credentials: Record<string, string>
  onChange: (key: string, value: string) => void
}) {
  if (provider === 'mercado_pago') {
    return (
      <SecretField
        label="Access Token *"
        placeholder="APP_USR..."
        value={credentials.accessToken ?? ''}
        onChange={(value) => onChange('accessToken', value)}
      />
    )
  }

  if (provider === 'pushinpay') {
    return (
      <SecretField
        label="API Key / Secret Key *"
        placeholder="Sua chave de API"
        value={credentials.apiKey ?? ''}
        onChange={(value) => onChange('apiKey', value)}
      />
    )
  }

  return (
    <div className="space-y-5">
      <SecretField
        label="Client ID *"
        placeholder="Seu client_id (UUID)"
        value={credentials.clientId ?? ''}
        onChange={(value) => onChange('clientId', value)}
      />
      <SecretField
        label="Client Secret *"
        placeholder="Seu client_secret"
        value={credentials.clientSecret ?? ''}
        onChange={(value) => onChange('clientSecret', value)}
      />
      <div className="rounded-[14px] border border-neon-purple/20 bg-neon-purple/10 px-4 py-3 text-sm font-bold text-gray-300">
        Obtenha suas credenciais em app.syncpayments.com.br
      </div>
    </div>
  )
}

function SecretField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-gray-500">{label}</span>
      <Input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-14 rounded-[14px] border-white/10 bg-[#151515] px-5 text-base font-bold text-white placeholder:text-gray-700 focus-visible:ring-neon-purple/40"
      />
    </label>
  )
}

function StripeSetup({
  currencies,
  onToggleCurrency,
}: {
  currencies: string[]
  onToggleCurrency: (code: string) => void
}) {
  return (
    <section className="space-y-5">
      <div className="rounded-[18px] border border-neon-purple/20 bg-neon-purple/10 p-5">
        <div className="flex items-start gap-3">
          <Globe2 size={20} className="mt-0.5 text-neon-purple" aria-hidden="true" />
          <div>
            <h3 className="text-lg font-black text-neon-purple">Conectar via OAuth</h3>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Clique para preparar a conexão Stripe Connect. Nesta versão, o cadastro fica como
              OAuth pendente até o backend final de autorização estar ativo.
            </p>
          </div>
        </div>
        <Button
          type="button"
          className="mt-5 h-12 w-full rounded-[14px] border border-neon-purple/45 bg-neon-purple px-5 text-base font-black text-white hover:bg-neon-purple/90"
        >
          <ExternalLink size={17} className="mr-2" aria-hidden="true" />
          Conectar com Stripe
        </Button>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-black text-gray-500">Moedas aceitas</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stripeCurrencies.map((currency) => {
            const active = currencies.includes(currency.code)
            return (
              <button
                key={currency.code}
                type="button"
                onClick={() => onToggleCurrency(currency.code)}
                className={cn(
                  'rounded-[14px] border px-3 py-4 text-center transition-colors',
                  active
                    ? 'border-neon-purple/45 bg-neon-purple/15 text-white'
                    : 'border-white/10 bg-white/[0.035] text-gray-500 hover:border-neon-purple/30',
                )}
              >
                <span className="block text-lg font-black">{currency.code}</span>
                <span className="mt-1 block text-xs font-bold text-gray-500">{currency.symbol}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-sm leading-6 text-gray-500">
          Em fluxos globais, o cliente escolhe entre as moedas selecionadas.
        </p>
      </div>

      <div className="rounded-[14px] border border-neon-purple/20 bg-neon-purple/10 px-4 py-3 text-sm leading-6 text-gray-300">
        <strong className="text-neon-purple">Split automático:</strong> a plataforma cobrará a
        comissão automaticamente quando a etapa de cobrança real for implementada.
      </div>
    </section>
  )
}

function ScopeButton({
  active,
  icon: Icon,
  label,
  text,
  onClick,
}: {
  active: boolean
  icon: LucideIcon
  label: string
  text: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-[16px] border px-4 py-5 text-center transition-colors',
        active
          ? 'border-neon-purple/35 bg-neon-purple/15 text-neon-purple'
          : 'border-white/10 bg-white/[0.025] text-gray-500 hover:border-neon-purple/30 hover:text-white',
      )}
    >
      <Icon size={23} className="mx-auto" aria-hidden="true" />
      <span className="mt-3 block text-base font-black">{label}</span>
      <span className="mt-1 block text-sm font-bold text-gray-500">{text}</span>
    </button>
  )
}

function isCredentialMissing(
  provider: PaymentGatewayProvider,
  credentials: Record<string, string>,
  hasExistingConnection: boolean,
  hasTypedCredential: boolean,
) {
  if (provider === 'stripe') return false

  const shouldRequire = !hasExistingConnection || hasTypedCredential
  if (!shouldRequire) return false

  if (provider === 'mercado_pago') return !credentials.accessToken?.trim()
  if (provider === 'pushinpay') return !credentials.apiKey?.trim()
  return !credentials.clientId?.trim() || !credentials.clientSecret?.trim()
}

function getStatusMeta(connection: PaymentGatewayConnection | null) {
  if (!connection) {
    return {
      label: 'Não conectado',
      className: 'border-white/10 bg-white/[0.035] text-gray-500',
    }
  }

  if (connection.status === 'connected') {
    return {
      label: 'Conectado',
      className: 'border-neon-green/25 bg-neon-green/10 text-neon-green',
    }
  }

  if (connection.status === 'pending_oauth') {
    return {
      label: 'OAuth pendente',
      className: 'border-neon-orange/30 bg-neon-orange/10 text-neon-orange',
    }
  }

  return {
    label: 'Erro',
    className: 'border-red-500/25 bg-red-500/10 text-red-300',
  }
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível concluir a ação.'
}
